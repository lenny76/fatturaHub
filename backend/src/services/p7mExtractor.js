const { execFile } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const os = require('os');
const fs = require('fs');
const crypto = require('crypto');
const iconv = require('iconv-lite');

const execFileAsync = promisify(execFile);

function detectEncoding(buffer, startOffset) {
  // Check for BOM
  if (buffer[startOffset] === 0xEF && buffer[startOffset + 1] === 0xBB && buffer[startOffset + 2] === 0xBF) {
    return 'utf-8-bom';
  }
  if (buffer[startOffset] === 0xFF && buffer[startOffset + 1] === 0xFE) {
    return 'utf-16le';
  }
  if (buffer[startOffset] === 0xFE && buffer[startOffset + 1] === 0xFF) {
    return 'utf-16be';
  }

  // Check XML declaration for encoding
  const slice = buffer.slice(startOffset, startOffset + 200);
  const xmlStart = slice.toString('ascii');
  const encodingMatch = xmlStart.match(/<\?xml[^>]+encoding=["']([^"']+)["']/i);
  if (encodingMatch) {
    return encodingMatch[1].toLowerCase();
  }

  // Default to UTF-8 for FatturaPA (should be standard)
  return 'utf-8';
}

function decodeBuffer(buffer, startOffset, length) {
  const encoding = detectEncoding(buffer, startOffset);
  console.log('[p7mExtractor] Detected encoding:', encoding);
  
  let xmlBuffer = buffer.slice(startOffset, startOffset + length);
  
  if (encoding === 'utf-8-bom') {
    xmlBuffer = xmlBuffer.slice(3);
    return xmlBuffer.toString('utf8');
  }
  
  if (encoding === 'utf-16le' || encoding === 'utf-16be') {
    return iconv.decode(xmlBuffer, encoding);
  }
  
  // For other encodings (iso-8859-1, windows-1252, etc.)
  if (encoding !== 'utf-8') {
    return iconv.decode(xmlBuffer, encoding);
  }
  
  // Default UTF-8
  return xmlBuffer.toString('utf8');
}

/**
 * Extract XML from a CAdES-BES p7m buffer by searching for the XML content
 * directly in the DER binary. Works without OpenSSL.
 *
 * In a FatturaPA p7m the XML payload is stored uncompressed and unencrypted
 * inside the CMS EncapsulatedContentInfo.eContent OCTET STRING, so we can
 * reliably find it by scanning for the XML start/end markers.
 *
 * @param {Buffer} buffer
 * @returns {string} XML string
 */
function extractXmlFromBuffer(buffer) {
  // Find the earliest XML start marker (any namespace prefix)
  const startMarkers = [
    Buffer.from('<?xml'),
    Buffer.from('<FatturaElettronica'),
  ];

  // Also scan for <PREFIX:FatturaElettronica with any prefix
  const genericMarker = Buffer.from('FatturaElettronica');

  let xmlStart = -1;

  // Try fixed markers first
  for (const marker of startMarkers) {
    const idx = buffer.indexOf(marker);
    if (idx !== -1 && (xmlStart === -1 || idx < xmlStart)) {
      xmlStart = idx;
    }
  }

  // Scan for <XX:FatturaElettronica (any prefix, max 10 chars)
  let searchFrom = 0;
  while (searchFrom < buffer.length) {
    const idx = buffer.indexOf(genericMarker, searchFrom);
    if (idx === -1) break;
    // Walk back to find the opening '<' (at most 12 bytes back for prefix + colon)
    let openBracket = idx - 1;
    while (openBracket >= 0 && openBracket >= idx - 12 && buffer[openBracket] !== 0x3c /* < */) {
      openBracket--;
    }
    if (openBracket >= 0 && buffer[openBracket] === 0x3c) {
      if (xmlStart === -1 || openBracket < xmlStart) {
        xmlStart = openBracket;
      }
    }
    searchFrom = idx + 1;
  }

  if (xmlStart === -1) {
    throw new Error('Contenuto XML non trovato nel file .p7m');
  }

  // Find end of XML content using raw bytes (search for closing tag pattern)
  // Need to search in raw bytes to handle different encodings
  const closeTagPatterns = [
    Buffer.from('</FatturaElettronica>'),
    Buffer.from('</p:FatturaElettronica>'),
    Buffer.from('</ns3:FatturaElettronica>'),
  ];
  
  let endIdx = -1;
  for (const pattern of closeTagPatterns) {
    // Search from xmlStart onwards
    for (let i = xmlStart; i < buffer.length - pattern.length; i++) {
      let found = true;
      for (let j = 0; j < pattern.length; j++) {
        if (buffer[i + j] !== pattern[j]) {
          found = false;
          break;
        }
      }
      if (found) {
        endIdx = i + pattern.length;
        console.log('[p7mExtractor] Found close tag at byte offset:', endIdx, 'pattern:', pattern.toString());
        break;
      }
    }
    if (endIdx !== -1) break;
  }
  
  // Try generic pattern with any namespace prefix
  if (endIdx === -1) {
    const genericClose = Buffer.from('FatturaElettronica>');
    for (let i = xmlStart; i < buffer.length - genericClose.length - 3; i++) {
      // Look for </ followed by optional prefix and FatturaElettronica>
      if (buffer[i] === 0x3c /* < */ && buffer[i + 1] === 0x2f /* / */) {
        // Skip </ and any prefix characters (letters, numbers, :), then check for FatturaElettronica>
        let pos = i + 2;
        while (pos < i + 2 + 20 && (buffer[pos] === 0x3a /* : */ || (buffer[pos] >= 0x41 && buffer[pos] <= 0x5A) || (buffer[pos] >= 0x61 && buffer[pos] <= 0x7A) || (buffer[pos] >= 0x30 && buffer[pos] <= 0x39))) {
          pos++;
        }
        let match = true;
        for (let j = 0; j < genericClose.length; j++) {
          if (buffer[pos + j] !== genericClose[j]) {
            match = false;
            break;
          }
        }
        if (match) {
          endIdx = pos + genericClose.length;
          console.log('[p7mExtractor] Found generic close tag at byte offset:', endIdx);
          break;
        }
      }
    }
  }

  if (endIdx === -1) {
    throw new Error('Tag di chiusura XML non trovato nel file .p7m');
  }

  const xmlLength = endIdx - xmlStart;
  
  // Decode with proper encoding detection
  const xmlRaw = decodeBuffer(buffer, xmlStart, xmlLength);
  
  console.log('[p7mExtractor] Extracted XML start:', xmlRaw.substring(0, 100));
  
  // Ensure XML has proper UTF-8 encoding declaration
  // Remove any existing encoding and add UTF-8
  let sanitized = xmlRaw.replace(/<\?xml\s+version=["']1\.[0-9]+["'](\s+encoding=["'][^"']+["'])?(\s+standalone=["'][^"']+["'])?\?>/i, 
    '<?xml version="1.0" encoding="UTF-8"?>');
  
  if (!sanitized.startsWith('<?xml')) {
    sanitized = '<?xml version="1.0" encoding="UTF-8"?>' + sanitized;
  }
  
  // Remove invalid XML characters (0x00-0x08, 0x0B, 0x0C, 0x0E-0x1F)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  
  // Remove UTF-8 replacement characters (U+FFFD) that appear from invalid byte sequences
  sanitized = sanitized.replace(/\uFFFD/g, '');
  
  // Remove any remaining control characters that might cause parsing issues
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\u200B-\u200D\uFEFF]/g, '');
  
  // Remove namespace prefixes from element names (p:, ds:, etc.)
  sanitized = sanitized
    .replace(/<(\w+):/g, '<')
    .replace(/<\/(\w+):/g, '</');
  
  // Remove namespace-prefixed attributes (like xsi:schemaLocation)
  sanitized = sanitized.replace(/\s+(\w+):(\w+)=/g, ' $2=');
  // Remove xmlns declarations
  sanitized = sanitized.replace(/\s+xmlns(:\w+)?="[^"]*"/g, '');
  
  return sanitized;
}

/**
 * Extract XML from a .p7m file.
 * Tries OpenSSL first (available in Docker/Linux), falls back to pure-JS extraction.
 *
 * @param {string} p7mFilePath - Absolute path to the .p7m file
 * @returns {Promise<string>} XML string
 */
async function extractFromP7m(p7mFilePath) {
  // Try OpenSSL (Docker/production)
  try {
    const tmpOutput = path.join(os.tmpdir(), `fh_${crypto.randomBytes(8).toString('hex')}.xml`);
    await execFileAsync('openssl', [
      'cms', '-verify', '-noverify',
      '-in', p7mFilePath, '-inform', 'DER',
      '-out', tmpOutput,
    ]);
    const xml = fs.readFileSync(tmpOutput, 'utf8');
    fs.unlinkSync(tmpOutput);
    return xml;
  } catch {
    // OpenSSL not available (Windows dev): parse DER buffer directly
    const buffer = fs.readFileSync(p7mFilePath);
    return extractXmlFromBuffer(buffer);
  }
}

/**
 * Extract XML from a .p7m buffer directly (used during upload before saving to disk).
 * @param {Buffer} buffer
 * @returns {string} XML string
 */
function extractXmlFromP7mBuffer(buffer) {
  return extractXmlFromBuffer(buffer);
}

module.exports = { extractFromP7m, extractXmlFromP7mBuffer, detectEncoding };
