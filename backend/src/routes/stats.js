const express = require('express');
const { getDb } = require('../db/schema');

const router = express.Router();

/**
 * GET /api/stats
 * Returns dashboard statistics
 */
/**
 * GET /api/stats/analysis
 * Aggregati (count, imponibile, IVA, totale) con filtri opzionali
 */
router.get('/analysis', (req, res) => {
  const { years, months, docType } = req.query;
  const db = getDb();

  const conditions = ["direction='passiva'"];
  const params = [];

  if (years) {
    const arr = years.split(',').map(y => parseInt(y)).filter(y => !isNaN(y));
    if (arr.length) { conditions.push(`year IN (${arr.map(() => '?').join(',')})`); params.push(...arr); }
  }
  if (months) {
    const arr = months.split(',').map(m => parseInt(m)).filter(m => !isNaN(m) && m >= 1 && m <= 12);
    if (arr.length) { conditions.push(`month IN (${arr.map(() => '?').join(',')})`); params.push(...arr); }
  }
  if (docType) { conditions.push('document_type = ?'); params.push(docType); }
  if (req.query.supplier) { conditions.push('supplier_name = ?'); params.push(req.query.supplier); }

  const where = 'WHERE ' + conditions.join(' AND ');
  const row = db.prepare(`
    SELECT COUNT(*) as count,
           SUM(taxable_amount) as sum_taxable,
           SUM(tax_amount) as sum_tax,
           SUM(total_amount) as sum_total
    FROM invoices ${where}
  `).get(params);

  res.json(row);
});

router.get('/', (req, res) => {
  const db = getDb();

  const totals = db.prepare(`
    SELECT COUNT(*) as total, SUM(total_amount) as total_amount
    FROM invoices WHERE direction='passiva'
  `).get();

  const byYear = db.prepare(`
    SELECT year, COUNT(*) as count, SUM(total_amount) as amount
    FROM invoices WHERE year IS NOT NULL AND direction='passiva'
    GROUP BY year ORDER BY year DESC
  `).all();

  const topSuppliers = db.prepare(`
    SELECT supplier_name, COUNT(*) as count, SUM(total_amount) as amount
    FROM invoices WHERE direction='passiva' AND supplier_name IS NOT NULL
    GROUP BY supplier_name ORDER BY count DESC LIMIT 10
  `).all();

  const recentImports = db.prepare(`
    SELECT id, filename, supplier_name, invoice_date, total_amount, imported_at
    FROM invoices WHERE direction='passiva' ORDER BY imported_at DESC LIMIT 10
  `).all();

  const years = db.prepare(`SELECT DISTINCT year FROM invoices WHERE year IS NOT NULL ORDER BY year ASC`).all().map(r => r.year);
  const docTypes = db.prepare(`SELECT DISTINCT document_type FROM invoices WHERE document_type IS NOT NULL ORDER BY document_type`).all().map(r => r.document_type);

  res.json({ totals, byYear, topSuppliers, recentImports, years, docTypes });
});

module.exports = router;
