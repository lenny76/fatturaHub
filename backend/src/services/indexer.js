const { getDb } = require('../db/schema');

// Prepared statements cached per DB instance to avoid re-compiling on every file
let _cachedDb = null;
let _runTransaction = null;

function ensureStmts() {
  const db = getDb();
  if (db === _cachedDb && _runTransaction) return;

  _cachedDb = db;

  const insert = db.prepare(`
    INSERT INTO invoices (
      filename, file_path, file_type, direction,
      transmission_format,
      supplier_vat, supplier_fiscal_code, supplier_name,
      buyer_vat, buyer_fiscal_code, buyer_name,
      invoice_number, invoice_date, document_type, year, month,
      total_amount, taxable_amount, tax_amount,
      xml_content, file_hash
    ) VALUES (
      @filename, @filePath, @fileType, @direction,
      @transmission_format,
      @supplier_vat, @supplier_fiscal_code, @supplier_name,
      @buyer_vat, @buyer_fiscal_code, @buyer_name,
      @invoice_number, @invoice_date, @document_type, @year, @month,
      @total_amount, @taxable_amount, @tax_amount,
      @xmlContent, @fileHash
    )
  `);

  const insertLine = db.prepare(`
    INSERT INTO invoice_lines (invoice_id, line_number, description, quantity, unit, unit_price, total_price, vat_rate, vat_nature)
    VALUES (@invoice_id, @line_number, @description, @quantity, @unit, @unit_price, @total_price, @vat_rate, @vat_nature)
  `);

  const insertFts = db.prepare(`
    INSERT INTO invoice_fts (invoice_id, supplier_name, descriptions, supplier_vat, invoice_number)
    VALUES (@invoice_id, @supplier_name, @descriptions, @supplier_vat, @invoice_number)
  `);

  _runTransaction = db.transaction(({ filename, filePath, fileType, direction, fileHash, xmlContent, invoice, lines }) => {
    const result = insert.run({ filename, filePath, fileType, direction, ...invoice, xmlContent, fileHash });
    const invoiceId = result.lastInsertRowid;

    for (const line of lines) {
      insertLine.run({ invoice_id: invoiceId, ...line });
    }

    const descriptions = lines.map((l) => l.description).filter(Boolean).join(' ');
    insertFts.run({
      invoice_id: invoiceId,
      supplier_name: invoice.supplier_name || '',
      descriptions,
      supplier_vat: invoice.supplier_vat || '',
      invoice_number: invoice.invoice_number || '',
    });

    return invoiceId;
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
function indexInvoice(opts) {
  ensureStmts();
  return _runTransaction(opts);
}

/**
 * Remove an invoice and its FTS entry.
 * @param {number} id
 */
function deleteInvoice(id) {
  const db = getDb();
  db.prepare(`DELETE FROM invoice_fts WHERE invoice_id = ?`).run(id);
  db.prepare(`DELETE FROM invoices WHERE id = ?`).run(id);
}

module.exports = { indexInvoice, deleteInvoice };
