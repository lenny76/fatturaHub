const express = require('express');
const { getDb } = require('../db/schema');
const { listInvoices } = require('../db/invoiceFilters');

const router = express.Router();

/**
 * GET /api/search
 * Alias di GET /api/invoices: stessi filtri (q, amount, years, months, docType,
 * supplierKey, page, limit, sort, order) — vedi db/invoiceFilters.js
 */
router.get('/', (req, res) => {
  try {
    res.json(listInvoices(getDb(), req.query));
  } catch (err) {
    console.error('[search]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
