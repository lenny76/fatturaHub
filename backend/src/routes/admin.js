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

module.exports = router;
