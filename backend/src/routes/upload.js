const express = require('express');
const multer = require('multer');
const path = require('path');
const iconv = require('iconv-lite');
const { parseFatturaPA, splitFatturaLotto, isSdiNotification } = require('../services/xmlParser');
const { extractXmlFromP7mBuffer, detectEncoding } = require('../services/p7mExtractor');
const { indexInvoice, lotHash } = require('../services/indexer');
const { hashBuffer, saveInvoiceFile, deleteInvoiceFile } = require('../utils/fileStore');
const { getDb } = require('../db/schema');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const name = file.originalname.toLowerCase();
    // cb(null, false) skips the file silently; cb(new Error) would abort the whole upload
    cb(null, name.endsWith('.xml') || name.endsWith('.p7m'));
  },
});

/**
 * POST /api/upload
 * Body: multipart with field "files[]" and "direction" (attiva|passiva)
 */
router.post('/', (req, res, next) => {
  upload.array('files', 500)(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ error: 'Troppi file: massimo 500 file per upload' });
      }
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File troppo grande: massimo 20MB per file' });
      }
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    const direction = 'passiva';
    const results = [];
    const checkDuplicate = getDb().prepare('SELECT id FROM invoices WHERE file_hash = ?');

    for (const file of req.files || []) {
      const originalName = file.originalname;
      const buffer = file.buffer;

      try {
        // Notifiche SDI (_RC_, _NS_, _MT_, ...) riconoscibili dal nome: non sono fatture
        if (isSdiNotification(originalName)) {
          results.push({ filename: originalName, status: 'skipped' });
          file.buffer = null;
          continue;
        }

        const fileHash = hashBuffer(buffer);
        const isP7m = originalName.toLowerCase().endsWith('.p7m');
        const fileType = isP7m ? 'p7m' : 'xml';

        // Check duplicate
        const existing = checkDuplicate.get(fileHash);
        if (existing) {
          results.push({ filename: originalName, status: 'duplicate', existingId: existing.id });
          file.buffer = null; // release memory
          continue;
        }

        // Stage 1: extract/decode XML — errors here mean the file is not a valid FatturaPA
        let xmlContent;
        try {
          if (isP7m) {
            xmlContent = extractXmlFromP7mBuffer(buffer);
          } else {
            const encoding = detectEncoding(buffer, 0);
            let xmlRaw;
            if (encoding === 'utf-8' || encoding === 'utf-8-bom') {
              xmlRaw = buffer.toString('utf8');
            } else {
              xmlRaw = iconv.decode(buffer, encoding);
            }
            xmlRaw = xmlRaw.replace(/^\uFEFF/, ''); // strip UTF-8 BOM if present
            xmlRaw = xmlRaw.replace(/<\?xml\s+version=["']1\.[0-9]+["'](\s+encoding=["'][^"']+["'])?(\s+standalone=["'][^"']+["'])?\?>/i,
              '<?xml version="1.0" encoding="UTF-8"?>');
            if (!xmlRaw.startsWith('<?xml')) xmlRaw = '<?xml version="1.0" encoding="UTF-8"?>' + xmlRaw;
            xmlRaw = xmlRaw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
            xmlRaw = xmlRaw.replace(/<(\w+):/g, '<');
            xmlRaw = xmlRaw.replace(/<\/(\w+):/g, '</');
            xmlRaw = xmlRaw.replace(/\s+(\w+):(\w+)=/g, ' $2=');
            xmlRaw = xmlRaw.replace(/\s+xmlns(:\w+)?="[^"]*"/g, '');
            xmlContent = xmlRaw;
          }
        } catch (err) {
          results.push({ filename: originalName, status: 'error', errorType: 'invalid', error: err.message });
          file.buffer = null;
          continue;
        }

        // Notifiche SDI con nome file non standard: riconosciute dall'elemento radice
        if (isSdiNotification(originalName, xmlContent)) {
          results.push({ filename: originalName, status: 'skipped' });
          file.buffer = null;
          continue;
        }

        // Stage 2: parse FatturaPA — errors here mean the file is not a valid FatturaPA.
        // Un lotto (più FatturaElettronicaBody) diventa una fattura per body; se un body
        // non è leggibile non si importa nulla del file.
        let parsed;
        try {
          parsed = splitFatturaLotto(xmlContent).map((xml) => ({ xml, ...parseFatturaPA(xml) }));
        } catch (err) {
          console.error(`[upload] XML parse error in "${originalName}":`, err.message);
          results.push({ filename: originalName, status: 'error', errorType: 'invalid', error: err.message });
          file.buffer = null;
          continue;
        }

        // Stage 3: save + index — errors here are unexpected import failures
        const year = parsed[0].invoice.year || new Date().getFullYear();
        const { relativePath } = saveInvoiceFile(buffer, originalName, direction, year);
        file.buffer = null; // buffer written to disk — release from memory

        let ids;
        try {
          ids = getDb().transaction(() => parsed.map(({ xml, invoice, lines }, i) => indexInvoice({
            filename: originalName,
            filePath: relativePath,
            fileType,
            direction,
            fileHash: lotHash(fileHash, i),
            xmlContent: xml,
            invoice,
            lines,
          })))();
        } catch (err) {
          deleteInvoiceFile(relativePath); // niente file orfani se l'indicizzazione fallisce
          throw err;
        }

        results.push({ filename: originalName, status: 'ok', id: ids[0], count: ids.length });
      } catch (err) {
        file.buffer = null;
        console.error(`[upload] Error processing ${originalName}:`, err.message);
        results.push({ filename: originalName, status: 'error', errorType: 'import', error: err.message });
      }
    }

    res.json({ results });
  } catch (err) {
    console.error('[upload] Unhandled error:', err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
