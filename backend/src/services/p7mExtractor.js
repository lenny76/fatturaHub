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
 * Parse a DER length field at buf[offset].
 * Returns { length, headerBytes } or null on error.
 */
function parseDerLength(buf, offset) {
  if (offset >= buf.length) return null;
  const first = buf[offset];
  if (first < 0x80) return { length: first, headerBytes: 1 };
  if (first === 0x80) return null; // indefinite not valid for primitives
  const numBytes = first & 0x7F;
  if (offset + numBytes >= buf.length) return null;
  let length = 0;
  for (let i = 0; i < numBytes; i++) length = length * 256 + buf[offset + 1 + i];
  return { length, headerBytes: 1 + numBytes };
}

/**
 * Starting at buf[firstChunkOffset] (a DER primitive OCTET STRING tag 0x04),
 * reassemble all consecutive primitive OCTET STRING chunks into a single Buffer.
 * This handles CAdES p7m files that split the XML payload across multiple chunks.
 */
function reassembleDerOctetChunks(buf, firstChunkOffset) {
  const parts = [];
  let pos = firstChunkOffset;
  while (pos + 2 < buf.length) {
    if (buf[pos] !== 0x04) break;
    const parsed = parseDerLength(buf, pos + 1);
    if (!parsed) break;
    const dataStart = pos + 1 + parsed.headerBytes;
    const dataEnd = dataStart + parsed.length;
    if (dataEnd > buf.length) break;
    parts.push(buf.slice(dataStart, dataEnd));
    pos = dataEnd;
    // Stop on end-of-contents (0x00 0x00)
    if (buf[pos] === 0x00 && buf[pos + 1] === 0x00) break;
  }
  return parts.length > 0 ? Buffer.concat(parts) : null;
}

/**
 * Find the end of the FatturaElettronica XML in buf starting from startOffset.
 * Returns the offset just past the closing tag, or -1 if not found.
 */
function findXmlEnd(buf, startOffset) {
  const closeTagPatterns = [
    Buffer.from('</FatturaElettronica>'),
    Buffer.from('</p:FatturaElettronica>'),
    Buffer.from('</ns3:FatturaElettronica>'),
  ];

  for (const pattern of closeTagPatterns) {
    for (let i = startOffset; i < buf.length - pattern.length; i++) {
      let found = true;
      for (let j = 0; j < pattern.length; j++) {
        if (buf[i + j] !== pattern[j]) { found = false; break; }
      }
      if (found) {
        console.log('[p7mExtractor] Found close tag at byte offset:', i + pattern.length, 'pattern:', pattern.toString());
        return i + pattern.length;
      }
    }
  }

  // Generic: </ [optional prefix:] FatturaElettronica>
  const genericClose = Buffer.from('FatturaElettronica>');
  for (let i = startOffset; i < buf.length - genericClose.length - 3; i++) {
    if (buf[i] !== 0x3c || buf[i + 1] !== 0x2f) continue;
    let pos = i + 2;
    while (pos < i + 22 && (buf[pos] === 0x3a || (buf[pos] >= 0x41 && buf[pos] <= 0x5A) || (buf[pos] >= 0x61 && buf[pos] <= 0x7A) || (buf[pos] >= 0x30 && buf[pos] <= 0x39))) pos++;
    let match = true;
    for (let j = 0; j < genericClose.length; j++) {
      if (buf[pos + j] !== genericClose[j]) { match = false; break; }
    }
    if (match) {
      console.log('[p7mExtractor] Found generic close tag at byte offset:', pos + genericClose.length);
      return pos + genericClose.length;
    }
  }

  return -1;
}

/**
 * Extract XML from a CAdES-BES p7m buffer by searching for the XML content
 * directly in the DER binary. Works without OpenSSL.
 *
 * In a FatturaPA p7m the XML payload is stored uncompressed and unencrypted
 * inside the CMS EncapsulatedContentInfo.eContent OCTET STRING, so we can
 * reliably find it by scanning for the XML start/end markers.
 *
 * When the payload is split across multiple DER primitive OCTET STRING chunks
 * (chunk size typically 1000 bytes), the chunks are reassembled before decoding
 * to prevent DER header bytes from corrupting the XML content.
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

  // Try to reassemble DER OCTET STRING chunks to avoid chunk-header bytes
  // corrupting the XML. Walk back from xmlStart to find the 04 tag of the
  // first chunk (chunk header ends exactly where XML data starts).
  let workBuffer = null;
  for (let back = 1; back <= 12; back++) {
    const pos = xmlStart - back;
    if (pos < 0) break;
    if (buffer[pos] !== 0x04) continue;
    const parsed = parseDerLength(buffer, pos + 1);
    if (!parsed) continue;
    const dataStart = pos + 1 + parsed.headerBytes;
    const offset = xmlStart - dataStart;
    if (offset >= 0 && offset <= 4) {
      // This 04 header leads to our XML data start (offset accounts for BOM or whitespace).
      const reassembled = reassembleDerOctetChunks(buffer, pos);
      if (reassembled) {
        workBuffer = reassembled;
        console.log('[p7mExtractor] Reassembled', reassembled.length, 'bytes from DER OCTET STRING chunks');
      }
      break;
    }
  }

  // Fall back to raw slice if reassembly was not possible
  if (!workBuffer) {
    const endIdx = findXmlEnd(buffer, xmlStart);
    if (endIdx === -1) throw new Error('Tag di chiusura XML non trovato nel file .p7m');
    workBuffer = buffer.slice(xmlStart, endIdx);
  }

  // Find end of XML in the work buffer (reassembled buffer may have trailing data)
  let endInWork = findXmlEnd(workBuffer, 0);
  if (endInWork === -1) endInWork = workBuffer.length;

  // Decode with proper encoding detection
  const xmlRaw = decodeBuffer(workBuffer, 0, endInWork);
  
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
