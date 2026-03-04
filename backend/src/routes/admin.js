const express = require('express');
const fs = require('fs');
const { getDb } = require('../db/schema');
const { FILES_PATH } = require('../utils/fileStore');

const router = express.Router();

/**
 * DELETE /api/admin/reset
 * Wipes all invoices from DB and all files from disk.
 */
router.delete('/reset', (req, res) => {
  try {
    const db = getDb();
    db.transaction(() => {
      db.prepare('DELETE FROM invoice_fts').run();
      db.prepare('DELETE FROM invoice_lines').run();
      db.prepare('DELETE FROM invoices').run();
    })();

    // Remove and recreate the files directory
    if (fs.existsSync(FILES_PATH)) {
      fs.rmSync(FILES_PATH, { recursive: true, force: true });
      fs.mkdirSync(FILES_PATH, { recursive: true });
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/rebuild-fts
 * Drops and rebuilds the FTS5 full-text search index from scratch.
 * Use this if search results are inconsistent or after a DB migration.
 */
router.post('/rebuild-fts', (req, res) => {
  try {
    const db = getDb();
    db.transaction(() => {
      db.prepare('DELETE FROM invoice_fts').run();
      db.prepare(`
        INSERT INTO invoice_fts (invoice_id, supplier_name, descriptions, supplier_vat, invoice_number)
        SELECT
          i.id,
          COALESCE(i.supplier_name, ''),
          COALESCE((SELECT GROUP_CONCAT(l.description, ' ') FROM invoice_lines l WHERE l.invoice_id = i.id), ''),
          COALESCE(i.supplier_vat, ''),
          COALESCE(i.invoice_number, '')
        FROM invoices i
      `).run();
    })();
    const { n } = db.prepare('SELECT COUNT(*) as n FROM invoice_fts').get();
    res.json({ ok: true, indexed: n });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
