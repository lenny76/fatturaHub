'use strict';

const path = require('path');
const fs = require('fs');
const { FILES_PATH } = require('../utils/fileStore');

const XSLT_FILES = {
  FPA: 'FatturaPA_v1.2.3.xsl',
  FPR: 'FatturaOrdinaria_v1.2.3.xsl',
  FSM: 'FatturaSemplificata_v1.0.2.xsl',
};

// Search in data/xslt/ first (Docker volume), then frontend/public/xslt/ (dev)
function getXsltSearchPaths() {
  const dataXslt = path.join(path.dirname(FILES_PATH), 'xslt');
  const frontendXslt = path.join(__dirname, '..', '..', '..', 'frontend', 'public', 'xslt');
  return [dataXslt, frontendXslt];
}

function findXslFile(transmissionFormat) {
  if (!transmissionFormat) return null;
  const prefix = transmissionFormat.substring(0, 3).toUpperCase();
  const filename = XSLT_FILES[prefix];
  if (!filename) return null;
  for (const dir of getXsltSearchPaths()) {
    const candidate = path.join(dir, filename);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

/**
 * Strip XML namespace prefixes so that xslt-processor can match AdE XPath patterns.
 * The stored XML may have <p:FatturaElettronica xmlns:p="..."> but the XSLT matches
 * on unprefixed names like <xsl:template match="FatturaElettronica">.
 */
function stripXmlNamespaces(xml) {
  return xml
    .replace(/<\?xml[^?]*\?>/i, '')           // remove XML declaration
    .replace(/<(\w+):/g, '<')                  // remove prefix from opening tags
    .replace(/<\/(\w+):/g, '</')               // remove prefix from closing tags
    .replace(/\s+\w+:\w+="[^"]*"/g, '')        // remove namespace-prefixed attributes (xsi:schemaLocation)
    .replace(/\s+xmlns(:\w+)?="[^"]*"/g, '')   // remove xmlns declarations
    .trim();
}

async function transformToHtml(xmlContent, transmissionFormat) {
  const xslPath = findXslFile(transmissionFormat);
  if (!xslPath) {
    const err = new Error(`Foglio XSLT non trovato per il formato: ${transmissionFormat}`);
    err.code = 'XSL_NOT_FOUND';
    throw err;
  }

  // AdE stylesheets declare version="1.1" but use only 1.0 features — normalize to avoid strict validation errors.
  // Also strip the xmlns:a namespace declaration and its "a:" prefix from all XPath expressions
  // so that the XSLT matches the namespace-stripped XML (e.g. "a:FatturaElettronica" → "FatturaElettronica").
  const xslString = fs.readFileSync(xslPath, 'utf8')
    .replace(/version="1\.1"/g, 'version="1.0"')
    .replace(/\s+xmlns:a="[^"]*"/g, '')
    .replace(/\ba:/g, '');
  const { Xslt, XmlParser } = require('xslt-processor');
  const xmlParser = new XmlParser();
  const xslt = new Xslt();

  // Strip namespace prefixes so XPath patterns in the XSLT can match element names
  const strippedXml = stripXmlNamespaces(xmlContent);

  const xmlDoc = xmlParser.xmlParse(strippedXml);
  const xslDoc = xmlParser.xmlParse(xslString);
  const html = await xslt.xsltProcess(xmlDoc, xslDoc);

  return html;
}

module.exports = { findXslFile, transformToHtml };
