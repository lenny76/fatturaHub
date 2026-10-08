const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../../data/db/fatturahub.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    // Dopo una transazione grande il file -wal resta della dimensione massima raggiunta:
    // limitarlo fa sì che venga troncato al checkpoint successivo
    db.pragma('journal_size_limit = 67108864'); // 64 MB
  }
  return db;
}

function initDb() {
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_type TEXT NOT NULL CHECK(file_type IN ('xml', 'p7m')),
      direction TEXT NOT NULL CHECK(direction IN ('attiva', 'passiva')),
      
      -- Formato trasmissione (es. FPR12, FPA12, FSM10)
      transmission_format TEXT,

      -- CedentePrestatore (supplier)
      supplier_vat TEXT,
      supplier_fiscal_code TEXT,
      supplier_name TEXT,

      -- CessionarioCommittente (buyer)
      buyer_vat TEXT,
      buyer_fiscal_code TEXT,
      buyer_name TEXT,

      -- DatiGenerali
      invoice_number TEXT NOT NULL,
      invoice_date TEXT NOT NULL,
      document_type TEXT,
      year INTEGER,
      month INTEGER,

      -- Amounts
      total_amount REAL,
      taxable_amount REAL,
      tax_amount REAL,

      -- Original XML content (for XSLT rendering)
      xml_content TEXT,

      -- Metadata
      imported_at TEXT DEFAULT (datetime('now')),
      file_hash TEXT UNIQUE NOT NULL
    );
  `);

  // Migration: add transmission_format column if it doesn't exist
  try {
    db.exec(`ALTER TABLE invoices ADD COLUMN transmission_format TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }

  // Migration: add month column if it doesn't exist
  try {
    db.exec(`ALTER TABLE invoices ADD COLUMN month INTEGER`);
  } catch (e) {
    // Column already exists, ignore
  }

  // Migration: add has_attachments column if it doesn't exist
  try {
    db.exec(`ALTER TABLE invoices ADD COLUMN has_attachments INTEGER DEFAULT 0`);
  } catch (e) {
    // Column already exists, ignore
  }

  // Migration: add ref_documents column if it doesn't exist
  // (documenti di riferimento — contratto/ordine/ecc. + causale — per ricerca full-text)
  try {
    db.exec(`ALTER TABLE invoices ADD COLUMN ref_documents TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }

  // Migration: add supplier_key column if it doesn't exist
  // (chiave fornitore per raggruppamento/filtro — vedi supplierKey() in xmlParser.js)
  try {
    db.exec(`ALTER TABLE invoices ADD COLUMN supplier_key TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }

  // Data migration: backfill month (and year) from invoice_date for records imported before the month column existed
  db.exec(`
    UPDATE invoices
    SET
      month = CAST(substr(invoice_date, 6, 2) AS INTEGER),
      year  = CAST(substr(invoice_date, 1, 4) AS INTEGER)
    WHERE month IS NULL AND invoice_date IS NOT NULL
  `);

  // Data migration: backfill has_attachments from xml_content for previously imported invoices
  db.exec(`
    UPDATE invoices
    SET has_attachments = CASE WHEN xml_content LIKE '%<Allegati>%' THEN 1 ELSE 0 END
    WHERE has_attachments = 0 AND xml_content IS NOT NULL
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS invoice_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      line_number INTEGER,
      description TEXT,
      quantity REAL,
      unit TEXT,
      unit_price REAL,
      total_price REAL,
      vat_rate REAL,
      vat_nature TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_invoices_year ON invoices(year);
    CREATE INDEX IF NOT EXISTS idx_invoices_month ON invoices(month);
    CREATE INDEX IF NOT EXISTS idx_invoices_direction ON invoices(direction);
    CREATE INDEX IF NOT EXISTS idx_invoices_supplier_name ON invoices(supplier_name);
    CREATE INDEX IF NOT EXISTS idx_invoices_buyer_name ON invoices(buyer_name);
    CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
    CREATE INDEX IF NOT EXISTS idx_invoices_doc_type ON invoices(document_type);
    CREATE INDEX IF NOT EXISTS idx_invoices_supplier_key ON invoices(supplier_key);

    CREATE VIRTUAL TABLE IF NOT EXISTS invoice_fts USING fts5(
      invoice_id UNINDEXED,
      supplier_name,
      descriptions,
      supplier_vat,
      invoice_number,
      ref_documents,
      tokenize='unicode61'
    );
  `);

  // Migration: ensure the FTS5 table has the ref_documents column.
  // FTS5 non supporta ALTER TABLE ADD COLUMN: se la colonna manca (DB creato
  // prima di questa feature) bisogna ricreare la virtual table e ripopolarla.
  const ftsColumns = db.prepare(`PRAGMA table_info(invoice_fts)`).all().map((c) => c.name);
  if (!ftsColumns.includes('ref_documents')) {
    db.exec(`
      DROP TABLE IF EXISTS invoice_fts;
      CREATE VIRTUAL TABLE invoice_fts USING fts5(
        invoice_id UNINDEXED,
        supplier_name,
        descriptions,
        supplier_vat,
        invoice_number,
        ref_documents,
        tokenize='unicode61'
      );
      INSERT INTO invoice_fts (invoice_id, supplier_name, descriptions, supplier_vat, invoice_number, ref_documents)
      SELECT
        i.id,
        COALESCE(i.supplier_name, ''),
        COALESCE((SELECT GROUP_CONCAT(l.description, ' ') FROM invoice_lines l WHERE l.invoice_id = i.id), ''),
        COALESCE(i.supplier_vat, ''),
        COALESCE(i.invoice_number, ''),
        COALESCE(i.ref_documents, '')
      FROM invoices i;
    `);
    console.log('FTS5 index migrated: added ref_documents column');
  }

  // Data migration v1: ri-parsa tutte le fatture dopo il fix del parser
  // (zeri iniziali persi in P.IVA/CF/numero fattura, aliquota 0% salvata come NULL,
  // supplier_key mancante). Il require è qui per evitare la dipendenza circolare
  // schema → indexer → schema.
  if (db.pragma('user_version', { simple: true }) < 1) {
    const { reindexAllInvoices } = require('../services/indexer');
    reindexAllInvoices('[migrazione v1]');
    db.pragma('user_version = 1');
  }

  // Riporta il file -wal a dimensione zero (vedi journal_size_limit in getDb)
  db.pragma('wal_checkpoint(TRUNCATE)');

  console.log('Database initialized at', DB_PATH);
}

module.exports = { getDb, initDb };
