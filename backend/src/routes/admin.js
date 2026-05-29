const express = require('express');
const fs = require('fs');
const { getDb } = require('../db/schema');
const { FILES_PATH } = require('../utils/fileStore');
const { parseFatturaPA } = require('../services/xmlParser');

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

    // Backfill ref_documents (contratto/ordine/causale/...) per i record importati
    // prima dell'introduzione della colonna, ri-parsando l'XML solo dove manca.
    const toBackfill = db
      .prepare('SELECT id, xml_content FROM invoices WHERE ref_documents IS NULL AND xml_content IS NOT NULL')
      .all();
    const updateRef = db.prepare('UPDATE invoices SET ref_documents = @ref_documents WHERE id = @id');

    console.log(`[rebuild-fts] avvio: ${toBackfill.length} fatture da ri-parsare per il backfill dei riferimenti`);
    let parseErrors = 0;

    db.transaction(() => {
      let done = 0;
      for (const row of toBackfill) {
        try {
          const { invoice } = parseFatturaPA(row.xml_content);
          updateRef.run({ id: row.id, ref_documents: invoice.ref_documents || '' });
        } catch (_) {
          updateRef.run({ id: row.id, ref_documents: '' });
          parseErrors++;
        }
        done++;
        if (done % 100 === 0 || done === toBackfill.length) {
          console.log(`[rebuild-fts] backfill ${done}/${toBackfill.length}`);
        }
      }

      console.log('[rebuild-fts] ricostruzione indice FTS5...');
      db.prepare('DELETE FROM invoice_fts').run();
      db.prepare(`
        INSERT INTO invoice_fts (invoice_id, supplier_name, descriptions, supplier_vat, invoice_number, ref_documents)
        SELECT
          i.id,
          COALESCE(i.supplier_name, ''),
          COALESCE((SELECT GROUP_CONCAT(l.description, ' ') FROM invoice_lines l WHERE l.invoice_id = i.id), ''),
          COALESCE(i.supplier_vat, ''),
          COALESCE(i.invoice_number, ''),
          COALESCE(i.ref_documents, '')
        FROM invoices i
      `).run();
    })();
    const { n } = db.prepare('SELECT COUNT(*) as n FROM invoice_fts').get();
    console.log(`[rebuild-fts] completato: ${n} fatture indicizzate, ${toBackfill.length} backfillate${parseErrors ? `, ${parseErrors} errori di parsing` : ''}`);
    res.json({ ok: true, indexed: n, backfilled: toBackfill.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/recalculate-amounts
 * Ricalcola total_amount, taxable_amount, tax_amount rileggendo xml_content
 * per tutti i record già presenti nel DB (utile dopo fix del parser).
 */
router.post('/recalculate-amounts', (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT id, xml_content FROM invoices WHERE xml_content IS NOT NULL').all();
    const update = db.prepare(
      'UPDATE invoices SET total_amount = @total_amount, taxable_amount = @taxable_amount, tax_amount = @tax_amount WHERE id = @id'
    );

    let updated = 0;
    let errors = 0;

    console.log(`[recalculate-amounts] avvio: ${rows.length} fatture da ricalcolare`);

    db.transaction(() => {
      let done = 0;
      for (const row of rows) {
        try {
          const { invoice } = parseFatturaPA(row.xml_content);
          update.run({
            id: row.id,
            total_amount: invoice.total_amount,
            taxable_amount: invoice.taxable_amount,
            tax_amount: invoice.tax_amount,
          });
          updated++;
        } catch (_) {
          errors++;
        }
        done++;
        if (done % 100 === 0 || done === rows.length) {
          console.log(`[recalculate-amounts] ${done}/${rows.length}`);
        }
      }
    })();

    console.log(`[recalculate-amounts] completato: ${updated} aggiornate, ${errors} errori`);
    res.json({ ok: true, updated, errors });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
