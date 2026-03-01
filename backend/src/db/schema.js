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

  // Data migration: backfill month (and year) from invoice_date for records imported before the month column existed
  db.exec(`
    UPDATE invoices
    SET
      month = CAST(substr(invoice_date, 6, 2) AS INTEGER),
      year  = CAST(substr(invoice_date, 1, 4) AS INTEGER)
    WHERE month IS NULL AND invoice_date IS NOT NULL
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

    CREATE VIRTUAL TABLE IF NOT EXISTS invoice_fts USING fts5(
      invoice_id UNINDEXED,
      supplier_name,
      descriptions,
      supplier_vat,
      invoice_number,
      tokenize='unicode61'
    );

    -- Migration: add missing columns to FTS5 for existing databases
    -- Recreate FTS table with new columns and reindex data
    CREATE TABLE IF NOT EXISTS invoice_fts_backup AS SELECT * FROM invoice_fts;
    DROP TABLE IF EXISTS invoice_fts;
    CREATE VIRTUAL TABLE IF NOT EXISTS invoice_fts USING fts5(
      invoice_id UNINDEXED,
      supplier_name,
      descriptions,
      supplier_vat,
      invoice_number,
      tokenize='unicode61'
    );

    -- Reindex all existing invoices into the new FTS structure
    INSERT INTO invoice_fts (invoice_id, supplier_name, descriptions, supplier_vat, invoice_number)
    SELECT 
      i.id,
      COALESCE(i.supplier_name, ''),
      COALESCE((SELECT GROUP_CONCAT(l.description, ' ') FROM invoice_lines l WHERE l.invoice_id = i.id), ''),
      COALESCE(i.supplier_vat, ''),
      COALESCE(i.invoice_number, '')
    FROM invoices i;
    DROP TABLE IF EXISTS invoice_fts_backup;
  `);

  console.log('Database initialized at', DB_PATH);
}

module.exports = { getDb, initDb };
