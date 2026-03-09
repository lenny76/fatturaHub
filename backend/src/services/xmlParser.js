const { XMLParser, XMLValidator } = require('fast-xml-parser');

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name) => ['DettaglioLinee', 'DatiRiepilogo', 'FatturaElettronicaBody'].includes(name),
  parseTagValue: true,
});

/**
 * Parse a FatturaPA XML string and extract structured data.
 * @param {string} xmlString
 * @returns {{ invoice: object, lines: object[] }}
 */
function parseFatturaPA(xmlString) {
  const validation = XMLValidator.validate(xmlString, { allowBooleanAttributes: true });
  if (validation !== true) {
    const { err } = validation;
    throw new Error(`XML non valido: ${err.msg} (riga ${err.line}, col ${err.col})`);
  }

  const doc = parser.parse(xmlString);

  // Root can be FatturaElettronica or <prefix>:FatturaElettronica (any namespace prefix)
  const rootKey = Object.keys(doc).find(
    (k) => k === 'FatturaElettronica' || k.endsWith(':FatturaElettronica')
  );
  const root = rootKey ? doc[rootKey] : null;

  if (!root) throw new Error('Formato XML non riconosciuto come FatturaPA');

  const header = root['FatturaElettronicaHeader'];
  const bodies = root['FatturaElettronicaBody'];
  const body = Array.isArray(bodies) ? bodies[0] : bodies;

  // --- Transmission Format ---
  const datiTrasmissione = header?.['DatiTrasmissione'] || {};
  const transmissionFormat = String(datiTrasmissione?.['FormatoTrasmissione'] || root['@_versione'] || '');

  // --- Supplier ---
  const cedente = header?.['CedentePrestatore'] || {};
  const cedenteDatiAnag = cedente?.['DatiAnagrafici'] || {};
  const cedenteIdFiscale = cedenteDatiAnag?.['IdFiscaleIVA'] || {};
  const cedenteAnag = cedenteDatiAnag?.['Anagrafica'] || {};

  const supplierVat = [cedenteIdFiscale['IdPaese'], cedenteIdFiscale['IdCodice']]
    .filter(Boolean)
    .join('');
  const supplierFiscalCode = cedenteDatiAnag?.['CodiceFiscale'] || null;
  const supplierName =
    cedenteAnag?.['Denominazione'] ||
    [cedenteAnag?.['Nome'], cedenteAnag?.['Cognome']].filter(Boolean).join(' ') ||
    null;

  // --- Buyer ---
  const cessionario = header?.['CessionarioCommittente'] || {};
  const cessionarioDatiAnag = cessionario?.['DatiAnagrafici'] || {};
  const cessionarioIdFiscale = cessionarioDatiAnag?.['IdFiscaleIVA'] || {};
  const cessionarioAnag = cessionarioDatiAnag?.['Anagrafica'] || {};

  const buyerVat = [cessionarioIdFiscale['IdPaese'], cessionarioIdFiscale['IdCodice']]
    .filter(Boolean)
    .join('');
  const buyerFiscalCode = cessionarioDatiAnag?.['CodiceFiscale'] || null;
  const buyerName =
    cessionarioAnag?.['Denominazione'] ||
    [cessionarioAnag?.['Nome'], cessionarioAnag?.['Cognome']].filter(Boolean).join(' ') ||
    null;

  // --- DatiGenerali ---
  const datiGenerali = body?.['DatiGenerali'] || {};
  const datiGeneraliDoc = datiGenerali?.['DatiGeneraliDocumento'] || {};

  const invoiceNumber = String(datiGeneraliDoc?.['Numero'] || '');
  const invoiceDate = String(datiGeneraliDoc?.['Data'] || '');
  const documentType = String(datiGeneraliDoc?.['TipoDocumento'] || '');
  const _rawTotal = parseFloat(datiGeneraliDoc?.['ImportoTotaleDocumento']);
  const totalAmount = isNaN(_rawTotal) ? null : _rawTotal;
  const year = invoiceDate ? parseInt(invoiceDate.split('-')[0]) : null;
  const month = invoiceDate ? parseInt(invoiceDate.split('-')[1]) : null;

  // --- Lines ---
  const datiBeniServizi = body?.['DatiBeniServizi'] || {};
  const rawLines = datiBeniServizi?.['DettaglioLinee'] || [];
  const lines = (Array.isArray(rawLines) ? rawLines : [rawLines]).map((l) => ({
    line_number: parseInt(l?.['NumeroLinea']) || null,
    description: String(l?.['Descrizione'] || ''),
    quantity: parseFloat(l?.['Quantita']) || null,
    unit: l?.['UnitaMisura'] || null,
    unit_price: parseFloat(l?.['PrezzoUnitario']) || null,
    total_price: parseFloat(l?.['PrezzoTotale']) || null,
    vat_rate: parseFloat(l?.['AliquotaIVA']) || null,
    vat_nature: l?.['Natura'] || null,
  }));

  // --- Tax summary ---
  const rawRiepilogo = datiBeniServizi?.['DatiRiepilogo'] || [];
  const riepilogo = Array.isArray(rawRiepilogo) ? rawRiepilogo : [rawRiepilogo];
  // null solo se DatiRiepilogo è assente; 0 è un valore valido (es. TD27)
  const taxableAmount = riepilogo.length === 0
    ? null
    : riepilogo.reduce((s, r) => s + (parseFloat(r?.['ImponibileImporto']) || 0), 0);
  const taxAmount = riepilogo.length === 0
    ? null
    : riepilogo.reduce((s, r) => s + (parseFloat(r?.['Imposta']) || 0), 0);

  return {
    invoice: {
      transmission_format: transmissionFormat,
      supplier_vat: supplierVat || null,
      supplier_fiscal_code: supplierFiscalCode,
      supplier_name: supplierName,
      buyer_vat: buyerVat || null,
      buyer_fiscal_code: buyerFiscalCode,
      buyer_name: buyerName,
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate,
      document_type: documentType,
      year,
      month,
      total_amount: totalAmount,
      taxable_amount: taxableAmount,
      tax_amount: taxAmount,
    },
    lines,
  };
}

module.exports = { parseFatturaPA };
