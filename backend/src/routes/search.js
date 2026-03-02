const express = require('express');
const { getDb } = require('../db/schema');

const router = express.Router();

/**
 * GET /api/search
 * Query params: q (full-text), direction, years, months, docType, supplier, buyer
 */
router.get('/', (req, res) => {
  const { q, direction, years, months, docType, supplier, buyer, page = 1, limit = 50 } = req.query;

  const db = getDb();
  const offset = (parseInt(page) - 1) * parseInt(limit);

  // Full-text search via FTS5
  if (q && q.trim()) {
    const ftsQuery = `"${q.trim().replace(/"/g, '')}"*`;
    const ftsRows = db.prepare(`
      SELECT invoice_id FROM invoice_fts WHERE invoice_fts MATCH ?
    `).all(ftsQuery);

    const ids = ftsRows.map(r => r.invoice_id);
    if (ids.length === 0) return res.json({ total: 0, page: 1, limit: parseInt(limit), data: [] });

    const placeholders = ids.map(() => '?').join(',');
    const conditions = [`id IN (${placeholders})`];
    const params = [...ids];

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

    const where = 'WHERE ' + conditions.join(' AND ');
    const total = db.prepare(`SELECT COUNT(*) as cnt FROM invoices ${where}`).get(params).cnt;
    const rows = db.prepare(`
      SELECT id, filename, file_type, direction, supplier_name, buyer_name,
             invoice_number, invoice_date, document_type, year,
             total_amount, taxable_amount, tax_amount, has_attachments
      FROM invoices ${where}
      ORDER BY invoice_date DESC
      LIMIT ${parseInt(limit)} OFFSET ${offset}
    `).all(params);

    return res.json({ total, page: parseInt(page), limit: parseInt(limit), data: rows });
  }

  // Filtered search without FTS
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
  if (supplier) { conditions.push("supplier_name LIKE ?"); params.push(`%${supplier}%`); }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const total = db.prepare(`SELECT COUNT(*) as cnt FROM invoices ${where}`).get(params).cnt;
  const rows = db.prepare(`
    SELECT id, filename, file_type, direction, supplier_name, buyer_name,
           invoice_number, invoice_date, document_type, year,
           total_amount, taxable_amount, tax_amount, has_attachments
    FROM invoices ${where}
    ORDER BY invoice_date DESC
    LIMIT ${parseInt(limit)} OFFSET ${offset}
  `).all(params);

  res.json({ total, page: parseInt(page), limit: parseInt(limit), data: rows });
});

module.exports = router;
