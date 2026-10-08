const { getDb } = require('../db/schema');
const { parseFatturaPA } = require('./xmlParser');

// Prepared statements cached per DB instance to avoid re-compiling on every file
let _cachedDb = null;
let _stmts = null;

function ensureStmts() {
  const db = getDb();
  if (db === _cachedDb && _stmts) return _stmts;

  _cachedDb = db;
  _stmts = {
    insert: db.prepare(`
      INSERT INTO invoices (
        filename, file_path, file_type, direction,
        transmission_format,
        supplier_vat, supplier_fiscal_code, supplier_name, supplier_key,
        buyer_vat, buyer_fiscal_code, buyer_name,
        invoice_number, invoice_date, document_type, year, month,
        total_amount, taxable_amount, tax_amount,
        xml_content, file_hash, has_attachments, ref_documents
      ) VALUES (
        @filename, @filePath, @fileType, @direction,
        @transmission_format,
        @supplier_vat, @supplier_fiscal_code, @supplier_name, @supplier_key,
        @buyer_vat, @buyer_fiscal_code, @buyer_name,
        @invoice_number, @invoice_date, @document_type, @year, @month,
        @total_amount, @taxable_amount, @tax_amount,
        @xmlContent, @fileHash, @hasAttachments, @ref_documents
      )
    `),
    update: db.prepare(`
      UPDATE invoices SET
        transmission_format = @transmission_format,
        supplier_vat = @supplier_vat, supplier_fiscal_code = @supplier_fiscal_code,
        supplier_name = @supplier_name, supplier_key = @supplier_key,
        buyer_vat = @buyer_vat, buyer_fiscal_code = @buyer_fiscal_code, buyer_name = @buyer_name,
        invoice_number = @invoice_number, invoice_date = @invoice_date, document_type = @document_type,
        year = @year, month = @month,
        total_amount = @total_amount, taxable_amount = @taxable_amount, tax_amount = @tax_amount,
        has_attachments = @hasAttachments, ref_documents = @ref_documents
      WHERE id = @id
    `),
    insertLine: db.prepare(`
      INSERT INTO invoice_lines (invoice_id, line_number, description, quantity, unit, unit_price, total_price, vat_rate, vat_nature)
      VALUES (@invoice_id, @line_number, @description, @quantity, @unit, @unit_price, @total_price, @vat_rate, @vat_nature)
    `),
    deleteLines: db.prepare(`DELETE FROM invoice_lines WHERE invoice_id = ?`),
    insertFts: db.prepare(`
      INSERT INTO invoice_fts (invoice_id, supplier_name, descriptions, supplier_vat, invoice_number, ref_documents)
      VALUES (@invoice_id, @supplier_name, @descriptions, @supplier_vat, @invoice_number, @ref_documents)
    `),
    deleteFts: db.prepare(`DELETE FROM invoice_fts WHERE invoice_id = ?`),
    deleteInvoice: db.prepare(`DELETE FROM invoices WHERE id = ?`),
  };
  return _stmts;
}

function hasAttachments(xmlContent) {
  return xmlContent && xmlContent.includes('<Allegati>') ? 1 : 0;
}

// Righe + indice full-text di una fattura (da chiamare dentro una transazione)
function writeLinesAndFts(stmts, invoiceId, invoice, lines) {
  for (const line of lines) {
    stmts.insertLine.run({ invoice_id: invoiceId, ...line });
  }
  stmts.insertFts.run({
    invoice_id: invoiceId,
    supplier_name: invoice.supplier_name || '',
    descriptions: lines.map((l) => l.description).filter(Boolean).join(' '),
    supplier_vat: invoice.supplier_vat || '',
    invoice_number: invoice.invoice_number || '',
    ref_documents: invoice.ref_documents || '',
  });
}

/**
 * Insert a parsed invoice + its lines into the database.
 * Also updates the FTS index.
 * @param {object} opts
 * @param {string} opts.filename
 * @param {string} opts.filePath       - relative path under FILES_PATH
 * @param {'xml'|'p7m'} opts.fileType
 * @param {'attiva'|'passiva'} opts.direction
 * @param {string} opts.fileHash       - SHA256 of original file
 * @param {string} opts.xmlContent     - raw XML string
 * @param {object} opts.invoice        - parsed invoice fields
 * @param {object[]} opts.lines        - parsed line items
 * @returns {number} inserted invoice id
 */
function indexInvoice({ filename, filePath, fileType, direction, fileHash, xmlContent, invoice, lines }) {
  const stmts = ensureStmts();
  return getDb().transaction(() => {
    const result = stmts.insert.run({
      filename, filePath, fileType, direction, ...invoice,
      ref_documents: invoice.ref_documents || '',
      xmlContent, fileHash, hasAttachments: hasAttachments(xmlContent),
    });
    const invoiceId = result.lastInsertRowid;
    writeLinesAndFts(stmts, invoiceId, invoice, lines);
    return invoiceId;
  })();
}

/**
 * Ricalcola tutti i campi derivati (anagrafiche, importi, righe, FTS) di una fattura
 * già importata ri-parsando il suo xml_content. Usato dopo fix del parser.
 * Da chiamare dentro una transazione. Lancia eccezione se l'XML non è parsabile.
 * @param {number} id
 * @param {string} xmlContent
 */
function reindexInvoice(id, xmlContent) {
  const stmts = ensureStmts();
  const { invoice, lines } = parseFatturaPA(xmlContent);
  stmts.update.run({
    id, ...invoice,
    ref_documents: invoice.ref_documents || '',
    hasAttachments: hasAttachments(xmlContent),
  });
  stmts.deleteLines.run(id);
  stmts.deleteFts.run(id);
  writeLinesAndFts(stmts, id, invoice, lines);
}

/**
 * Ri-parsa tutte le fatture del DB (a blocchi, per non caricare tutto l'XML in memoria).
 * @param {string} logPrefix - prefisso per i log di avanzamento
 * @returns {{ updated: number, errors: number }}
 */
function reindexAllInvoices(logPrefix = '[reindex]') {
  const db = getDb();
  const ids = db.prepare('SELECT id FROM invoices WHERE xml_content IS NOT NULL ORDER BY id').pluck().all();
  const getXml = db.prepare('SELECT xml_content FROM invoices WHERE id = ?').pluck();
  const BATCH = 250;
  let updated = 0;
  let errors = 0;

  console.log(`${logPrefix} avvio: ${ids.length} fatture da ri-elaborare`);
  const runBatch = db.transaction((batchIds) => {
    for (const id of batchIds) {
      try {
        reindexInvoice(id, getXml.get(id));
        updated++;
      } catch (err) {
        errors++;
        console.error(`${logPrefix} fattura id=${id}: ${err.message}`);
      }
    }
  });
  for (let i = 0; i < ids.length; i += BATCH) {
    runBatch(ids.slice(i, i + BATCH));
    console.log(`${logPrefix} ${Math.min(i + BATCH, ids.length)}/${ids.length}`);
  }
  console.log(`${logPrefix} completato: ${updated} aggiornate, ${errors} errori`);
  return { updated, errors };
}

/**
 * Remove an invoice and its FTS entry (lines are removed by ON DELETE CASCADE).
 * @param {number} id
 */
function deleteInvoice(id) {
  const stmts = ensureStmts();
  getDb().transaction(() => {
    stmts.deleteFts.run(id);
    stmts.deleteInvoice.run(id);
  })();
}

module.exports = { indexInvoice, reindexInvoice, reindexAllInvoices, deleteInvoice };
