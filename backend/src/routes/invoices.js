const express = require('express');
const path = require('path');
const fs = require('fs');
const { getDb } = require('../db/schema');
const { deleteInvoice } = require('../services/indexer');
const { deleteInvoiceFile, FILES_PATH } = require('../utils/fileStore');
const { findXslFile, transformToHtml } = require('../services/xsltTransformer');

const router = express.Router();

/**
 * GET /api/invoices
 * Query params: direction, year, docType, page, limit, sort, order
 */
router.get('/', (req, res) => {
  const {
    direction,
    years,
    months,
    docType,
    page = 1,
    limit = 50,
    sort = 'invoice_date',
    order = 'DESC',
  } = req.query;

  const validSorts = ['invoice_date', 'supplier_name', 'buyer_name', 'total_amount', 'invoice_number', 'imported_at'];
  const safeSort = validSorts.includes(sort) ? sort : 'invoice_date';
  const safeOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const conditions = [];
  const params = [];

  if (direction) { conditions.push('direction = ?'); params.push(direction); }
  if (years) {
    const yearsArr = years.split(',').map(y => parseInt(y)).filter(y => !isNaN(y));
    if (yearsArr.length > 0) {
      conditions.push(`year IN (${yearsArr.map(() => '?').join(',')})`);
      params.push(...yearsArr);
    }
  }
  if (months) {
    const monthsArr = months.split(',').map(m => parseInt(m)).filter(m => !isNaN(m) && m >= 1 && m <= 12);
    if (monthsArr.length > 0) {
      conditions.push(`month IN (${monthsArr.map(() => '?').join(',')})`);
      params.push(...monthsArr);
    }
  }
  if (docType) { conditions.push('document_type = ?'); params.push(docType); }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const db = getDb();
  const total = db.prepare(`SELECT COUNT(*) as cnt FROM invoices ${where}`).get(params).cnt;
  const rows = db.prepare(`
    SELECT id, filename, file_type, direction, transmission_format,
           supplier_name, buyer_name,
           invoice_number, invoice_date, document_type, year,
           total_amount, taxable_amount, tax_amount, imported_at
    FROM invoices ${where}
    ORDER BY ${safeSort} ${safeOrder}
    LIMIT ${parseInt(limit)} OFFSET ${offset}
  `).all(params);

  res.json({ total, page: parseInt(page), limit: parseInt(limit), data: rows });
});

/**
 * GET /api/invoices/parties
 * Returns all unique suppliers with counts (for sidebar filter).
 * Query: years, months, q, supplier
 * MUST be defined before /:id to avoid Express matching 'parties' as an id.
 */
router.get('/parties', (req, res) => {
  const { years, months, q, supplier } = req.query;
  const db = getDb();

  // If search query is provided, use FTS to find matching invoice IDs first
  let invoiceIds = null;
  if (q && q.trim()) {
    const ftsQuery = `"${q.trim().replace(/"/g, '')}"*`;
    const ftsRows = db.prepare(`
      SELECT invoice_id FROM invoice_fts WHERE invoice_fts MATCH ?
    `).all(ftsQuery);
    invoiceIds = ftsRows.map(r => r.invoice_id);
    if (invoiceIds.length === 0) {
      return res.json({ suppliers: [] });
    }
  }

  const params = [];
  const conditions = ["direction='passiva'", 'supplier_name IS NOT NULL'];

  if (invoiceIds) {
    conditions.push(`id IN (${invoiceIds.map(() => '?').join(',')})`);
    params.push(...invoiceIds);
  }

  if (supplier) {
    conditions.push("supplier_name LIKE ?");
    params.push(`%${supplier}%`);
  }

  if (years) {
    const yearsArr = years.split(',').map(y => parseInt(y)).filter(y => !isNaN(y));
    if (yearsArr.length > 0) {
      conditions.push(`year IN (${yearsArr.map(() => '?').join(',')})`);
      params.push(...yearsArr);
    }
  }
  if (months) {
    const monthsArr = months.split(',').map(m => parseInt(m)).filter(m => !isNaN(m) && m >= 1 && m <= 12);
    if (monthsArr.length > 0) {
      conditions.push(`month IN (${monthsArr.map(() => '?').join(',')})`);
      params.push(...monthsArr);
    }
  }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  const suppliers = db.prepare(`
    SELECT supplier_name as name, COUNT(*) as count
    FROM invoices ${where}
    GROUP BY supplier_name ORDER BY supplier_name COLLATE NOCASE ASC
  `).all(params);

  res.json({ suppliers });
});

/**
 * GET /api/invoices/:id
 * Returns full invoice with lines (no xml_content to keep response small)
 */
router.get('/:id', (req, res) => {
  const db = getDb();
  const invoice = db.prepare(`
    SELECT id, filename, file_path, file_type, direction, transmission_format,
           supplier_vat, supplier_fiscal_code, supplier_name,
           buyer_vat, buyer_fiscal_code, buyer_name,
           invoice_number, invoice_date, document_type, year,
           total_amount, taxable_amount, tax_amount, imported_at
    FROM invoices WHERE id = ?
  `).get(req.params.id);

  if (!invoice) return res.status(404).json({ error: 'Fattura non trovata' });

  const lines = db.prepare(`
    SELECT line_number, description, quantity, unit, unit_price, total_price, vat_rate, vat_nature
    FROM invoice_lines WHERE invoice_id = ? ORDER BY line_number
  `).all(req.params.id);

  res.json({ ...invoice, lines });
});

/**
 * GET /api/invoices/:id/ministeriale
 * Server-side XSLT transformation → returns HTML.
 * 404 if XSL stylesheet not found; 500 if transformation fails.
 */
router.get('/:id/ministeriale', async (req, res) => {
  try {
    const db = getDb();
    const row = db.prepare('SELECT xml_content, transmission_format FROM invoices WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Fattura non trovata' });
    if (!row.xml_content) return res.status(404).json({ error: 'Contenuto XML non disponibile' });

    let html;
    try {
      html = await transformToHtml(row.xml_content, row.transmission_format);
    } catch (transformErr) {
      if (transformErr.code === 'XSL_NOT_FOUND') {
        return res.status(404).json({ error: transformErr.message, format: row.transmission_format });
      }
      console.error('[ministeriale] XSLT transform error:', transformErr.message);
      return res.status(500).json({ error: 'Errore trasformazione XSLT: ' + transformErr.message });
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    console.error('[ministeriale] unexpected error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/invoices/:id/xml
 * Returns the raw XML content (for XSLT rendering in browser)
 */
router.get('/:id/xml', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT xml_content FROM invoices WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Fattura non trovata' });

  let xmlContent = row.xml_content;
  // Ensure XML has proper UTF-8 encoding declaration for browser parsing
  // Remove any existing encoding and add UTF-8
  xmlContent = xmlContent.replace(/<\?xml\s+version=["']1\.[0-9]+["'](\s+encoding=["'][^"']+["'])?(\s+standalone=["'][^"']+["'])?\?>/i, 
    '<?xml version="1.0" encoding="UTF-8"?>');
  
  if (!xmlContent.startsWith('<?xml')) {
    xmlContent = '<?xml version="1.0" encoding="UTF-8"?>' + xmlContent;
  }

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.send(xmlContent);
});

/**
 * GET /api/invoices/:id/download
 * Download the original file (xml or p7m)
 */
router.get('/:id/download', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT filename, file_path FROM invoices WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Fattura non trovata' });

  const absPath = path.join(FILES_PATH, row.file_path);
  if (!fs.existsSync(absPath)) return res.status(404).json({ error: 'File non trovato sul disco' });

  res.download(absPath, row.filename);
});

/**
 * DELETE /api/invoices/:id
 */
router.delete('/:id', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT file_path FROM invoices WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Fattura non trovata' });

  deleteInvoice(parseInt(req.params.id));
  deleteInvoiceFile(row.file_path);

  res.json({ ok: true });
});

module.exports = router;
