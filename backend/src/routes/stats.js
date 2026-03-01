const express = require('express');
const { getDb } = require('../db/schema');

const router = express.Router();

/**
 * GET /api/stats
 * Returns dashboard statistics
 */
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
