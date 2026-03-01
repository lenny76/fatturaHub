const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const FILES_PATH = process.env.FILES_PATH || path.join(__dirname, '../../../data/files');

/**
 * Compute SHA256 hash of a buffer.
 * @param {Buffer} buffer
 * @returns {string} hex hash
 */
function hashBuffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Save an uploaded file to the appropriate directory.
 * @param {Buffer} buffer          - file content
 * @param {string} filename        - original filename
 * @param {'attiva'|'passiva'} direction
 * @param {number|string} year
 * @returns {{ savedPath: string, relativePath: string }} absolute and relative paths
 */
function saveInvoiceFile(buffer, filename, direction, year) {
  const dir = path.join(FILES_PATH, direction, String(year));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Avoid collisions by appending hash prefix if file exists
  let destFilename = filename;
  let destPath = path.join(dir, destFilename);
  if (fs.existsSync(destPath)) {
    const prefix = crypto.randomBytes(4).toString('hex');
    destFilename = `${prefix}_${filename}`;
    destPath = path.join(dir, destFilename);
  }

  fs.writeFileSync(destPath, buffer);

  const relativePath = path.join(direction, String(year), destFilename).replace(/\\/g, '/');
  return { savedPath: destPath, relativePath };
}

/**
 * Delete a file from storage.
 * @param {string} relativePath
 */
function deleteInvoiceFile(relativePath) {
  const absPath = path.join(FILES_PATH, relativePath);
  if (fs.existsSync(absPath)) fs.unlinkSync(absPath);
}

module.exports = { hashBuffer, saveInvoiceFile, deleteInvoiceFile, FILES_PATH };
