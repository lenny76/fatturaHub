const express = require('express');
const { getDb } = require('../db/schema');
const { buildInvoiceFilters, signedAmount } = require('../db/invoiceFilters');

const router = express.Router();

/**
 * GET /api/stats/analysis
 * Aggregati (count, imponibile, IVA, totale) con gli stessi filtri della lista.
 * Le note di credito sono sottratte.
 */
router.get('/analysis', (req, res) => {
  try {
    const { where, params } = buildInvoiceFilters(req.query);
    const row = getDb().prepare(`
      SELECT COUNT(*) as count,
             SUM(${signedAmount('taxable_amount')}) as sum_taxable,
             SUM(${signedAmount('tax_amount')}) as sum_tax,
             SUM(${signedAmount('total_amount')}) as sum_total
      FROM invoices ${where}
    `).get(params);

    res.json(row);
  } catch (err) {
    console.error('[stats/analysis]', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/stats
 * Returns dashboard statistics (importi al netto delle note di credito)
 */
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const total = signedAmount('total_amount');

    const totals = db.prepare(`
      SELECT COUNT(*) as total, SUM(${total}) as total_amount
      FROM invoices WHERE direction='passiva'
    `).get();

    const byYear = db.prepare(`
      SELECT year, COUNT(*) as count, SUM(${total}) as amount
      FROM invoices WHERE year IS NOT NULL AND direction='passiva'
      GROUP BY year ORDER BY year DESC
    `).all();

    // MAX(invoice_date) → supplier_name della fattura più recente (bare column SQLite)
    const topSuppliers = db.prepare(`
      SELECT supplier_key, supplier_name, COUNT(*) as count, SUM(${total}) as amount, MAX(invoice_date) as last_date
      FROM invoices WHERE direction='passiva' AND supplier_key IS NOT NULL
      GROUP BY supplier_key ORDER BY count DESC LIMIT 10
    `).all();

    const recentImports = db.prepare(`
      SELECT id, filename, supplier_name, invoice_date, document_type, total_amount, imported_at
      FROM invoices WHERE direction='passiva' ORDER BY imported_at DESC LIMIT 10
    `).all();

    const years = db.prepare(`SELECT DISTINCT year FROM invoices WHERE year IS NOT NULL ORDER BY year ASC`).all().map(r => r.year);
    const docTypes = db.prepare(`SELECT DISTINCT document_type FROM invoices WHERE document_type IS NOT NULL ORDER BY document_type`).all().map(r => r.document_type);

    res.json({ totals, byYear, topSuppliers, recentImports, years, docTypes });
  } catch (err) {
    console.error('[stats]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
