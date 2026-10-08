const express = require('express');
const path = require('path');
const fs = require('fs');
const { XMLParser } = require('fast-xml-parser');
const { getDb } = require('../db/schema');
const { deleteInvoice } = require('../services/indexer');
const { deleteInvoiceFile, FILES_PATH } = require('../utils/fileStore');
const { findXslFile, transformToHtml } = require('../services/xsltTransformer');
const { buildInvoiceFilters, listInvoices } = require('../db/invoiceFilters');

const router = express.Router();

/**
 * GET /api/invoices
 * Query params: q, amount, years, months, docType, supplierKey, page, limit, sort, order
 * (vedi db/invoiceFilters.js)
 */
router.get('/', (req, res) => {
  try {
    res.json(listInvoices(getDb(), req.query));
  } catch (err) {
    console.error('[invoices]', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/invoices/parties
 * Fornitori (raggruppati per supplier_key) con conteggio, per la sidebar.
 * Stessi filtri della lista, escluso il fornitore stesso.
 * Il nome mostrato è quello della fattura più recente del fornitore.
 * MUST be defined before /:id to avoid Express matching 'parties' as an id.
 */
router.get('/parties', (req, res) => {
  try {
    const { where, params } = buildInvoiceFilters({ ...req.query, supplierKey: undefined });
    // MAX(invoice_date) fa sì che supplier_name provenga dalla fattura più recente (bare column SQLite)
    const suppliers = getDb().prepare(`
      SELECT supplier_key as key, supplier_name as name, COUNT(*) as count, MAX(invoice_date) as last_date
      FROM invoices ${where} AND supplier_key IS NOT NULL
      GROUP BY supplier_key
    `).all(params)
      .map(({ key, name, count }) => ({ key, name, count }))
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'it', { sensitivity: 'base' }));

    res.json({ suppliers });
  } catch (err) {
    console.error('[parties]', err.message);
    res.status(500).json({ error: err.message });
  }
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
 * GET /api/invoices/:id/attachments/:index/download
 * Decodifica e serve il file allegato (base64) all'indice :index (0-based).
 * ?inline=1 → Content-Disposition: inline (per anteprima nel browser)
 * default   → Content-Disposition: attachment (download forzato)
 */
router.get('/:id/attachments/:index/download', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT xml_content FROM invoices WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Fattura non trovata' });
  if (!row.xml_content) return res.status(404).json({ error: 'Contenuto XML non disponibile' });

  let allegati;
  try {
    const attParser = new XMLParser({
      ignoreAttributes: false,
      isArray: (name) => name === 'Allegati',
      parseTagValue: false, // valori come stringhe (es. NomeAttachment numerico non diventa number)
    });
    const doc = attParser.parse(row.xml_content);
    const rootKey = Object.keys(doc).find(
      (k) => k === 'FatturaElettronica' || k.endsWith(':FatturaElettronica')
    );
    if (!rootKey) return res.status(404).json({ error: 'Struttura XML non valida' });
    const bodies = doc[rootKey]['FatturaElettronicaBody'];
    const body = Array.isArray(bodies) ? bodies[0] : bodies;
    const raw = body?.['Allegati'];
    allegati = Array.isArray(raw) ? raw : (raw ? [raw] : []);
  } catch (e) {
    console.error('[attachments] XML parse error:', e.message);
    return res.status(500).json({ error: 'Errore parsing XML: ' + e.message });
  }

  const index = parseInt(req.params.index, 10);
  if (isNaN(index) || index < 0 || index >= allegati.length) {
    return res.status(404).json({ error: 'Allegato non trovato' });
  }

  const att = allegati[index];
  const nome = String(att['NomeAttachment'] || `allegato_${index}`);
  const formato = String(att['FormatoAttachment'] || '').toUpperCase();
  const algoritmo = String(att['AlgoritmoCompressione'] || '').toUpperCase();
  const base64 = String(att['Attachment'] || '');

  if (!base64) return res.status(404).json({ error: 'Contenuto allegato mancante' });

  const MIME_MAP = {
    PDF: 'application/pdf', XML: 'application/xml', ZIP: 'application/zip',
    TXT: 'text/plain', CSV: 'text/csv',
    XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    XLS: 'application/vnd.ms-excel',
    DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    DOC: 'application/msword', PNG: 'image/png', JPG: 'image/jpeg',
    JPEG: 'image/jpeg', P7M: 'application/pkcs7-mime',
  };
  const mimeType = algoritmo === 'ZIP'
    ? 'application/zip'
    : (MIME_MAP[formato] || 'application/octet-stream');

  const fileBuffer = Buffer.from(base64, 'base64');
  const safeNome = nome.replace(/["\r\n]/g, '_');
  const isInline = req.query.inline === '1';

  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition',
    `${isInline ? 'inline' : 'attachment'}; filename="${safeNome}"`);
  res.setHeader('Content-Length', fileBuffer.length);
  res.send(fileBuffer);
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
