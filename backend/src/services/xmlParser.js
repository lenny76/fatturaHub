const { XMLParser, XMLValidator } = require('fast-xml-parser');

// parseTagValue: false — tutti i valori restano stringhe. Con true i codici numerici
// perdono gli zeri iniziali (P.IVA "01234567890" → 1234567890, Numero "000043" → 43).
// Gli importi vengono convertiti esplicitamente con num().
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name) => ['DettaglioLinee', 'DatiRiepilogo', 'FatturaElettronicaBody'].includes(name),
  parseTagValue: false,
});

// null solo se assente/non numerico: 0 è un valore valido (aliquota 0%, TD27, ...)
function num(value) {
  const n = parseFloat(value);
  return isNaN(n) ? null : n;
}

// P.IVA generica dei soggetti esteri senza partita IVA (es. "CNOO99999999999")
const PLACEHOLDER_VAT = /^[A-Z]{2}O{2}9{11}$/;

/**
 * Chiave che identifica un fornitore per raggruppamento e filtro.
 * - P.IVA, così le varianti della ragione sociale ("SPA" / "S.P.A.") restano unite
 * - P.IVA + CF se il CF è di una società (11 cifre) diverso dalla P.IVA: membri di un
 *   Gruppo IVA, società distinte che condividono la stessa P.IVA
 * - CF o nome se la P.IVA manca o è generica (fornitori esteri diversi con la stessa P.IVA fittizia)
 */
function supplierKey(vat, fiscalCode, name) {
  if (vat && !PLACEHOLDER_VAT.test(vat)) {
    const vatDigits = vat.slice(2);
    return fiscalCode && /^\d{11}$/.test(fiscalCode) && fiscalCode !== vatDigits
      ? `${vat}/${fiscalCode}`
      : vat;
  }
  return fiscalCode || (name ? `NOME:${name.toUpperCase()}` : null);
}

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
  const year = invoiceDate ? parseInt(invoiceDate.split('-')[0]) : null;
  const month = invoiceDate ? parseInt(invoiceDate.split('-')[1]) : null;

  // --- Lines ---
  const datiBeniServizi = body?.['DatiBeniServizi'] || {};
  const rawLines = datiBeniServizi?.['DettaglioLinee'] || [];
  const lines = (Array.isArray(rawLines) ? rawLines : [rawLines]).map((l) => ({
    line_number: parseInt(l?.['NumeroLinea']) || null,
    description: String(l?.['Descrizione'] || ''),
    quantity: num(l?.['Quantita']),
    unit: l?.['UnitaMisura'] || null,
    unit_price: num(l?.['PrezzoUnitario']),
    total_price: num(l?.['PrezzoTotale']),
    vat_rate: num(l?.['AliquotaIVA']),
    vat_nature: l?.['Natura'] || null,
  }));

  // --- Documenti di riferimento (per ricerca full-text) ---
  // Contratto, Ordine, Convenzione, Ricezione, Fatture collegate: IdDocumento + CUP + CIG.
  // Più la/le Causale del documento.
  const refTokens = [];
  const refTags = [
    'DatiOrdineAcquisto',
    'DatiContratto',
    'DatiConvenzione',
    'DatiRicezione',
    'DatiFattureCollegate',
  ];
  for (const tag of refTags) {
    let blocks = datiGenerali?.[tag];
    if (!blocks) continue;
    if (!Array.isArray(blocks)) blocks = [blocks];
    for (const b of blocks) {
      for (const field of ['IdDocumento', 'CodiceCUP', 'CodiceCIG']) {
        const v = b?.[field];
        if (v != null && String(v).trim()) refTokens.push(String(v).trim());
      }
    }
  }
  let causale = datiGeneraliDoc?.['Causale'];
  if (causale != null) {
    if (!Array.isArray(causale)) causale = [causale];
    for (const c of causale) {
      if (c != null && String(c).trim()) refTokens.push(String(c).trim());
    }
  }
  const refDocuments = refTokens.join(' ');

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

  // --- Modalità di pagamento (MP01 contanti, MP05 bonifico, MP12 RIBA, ...) ---
  // Codici distinti di tutti i DettaglioPagamento (anche di più blocchi DatiPagamento),
  // ordinati e separati da virgola (es. "MP05", "MP05,MP12"); null se assenti.
  const asArray = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
  const paymentMethods = [...new Set(
    asArray(body?.['DatiPagamento'])
      .flatMap((p) => asArray(p?.['DettaglioPagamento']))
      .map((d) => String(d?.['ModalitaPagamento'] || '').trim().toUpperCase())
      .filter(Boolean),
  )].sort().join(',') || null;

  // ImportoTotaleDocumento è facoltativo nel tracciato (spesso assente nelle
  // autofatture TD27): in quel caso il totale è imponibile + IVA del riepilogo.
  let totalAmount = num(datiGeneraliDoc?.['ImportoTotaleDocumento']);
  if (totalAmount === null && taxableAmount !== null) {
    totalAmount = Math.round((taxableAmount + taxAmount) * 100) / 100;
  }

  return {
    invoice: {
      transmission_format: transmissionFormat,
      supplier_vat: supplierVat || null,
      supplier_fiscal_code: supplierFiscalCode,
      supplier_name: supplierName,
      supplier_key: supplierKey(supplierVat, supplierFiscalCode, supplierName),
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
      ref_documents: refDocuments,
      payment_methods: paymentMethods,
    },
    lines,
  };
}

const BODY_OPEN = /<(?:[\w.-]+:)?FatturaElettronicaBody[\s>]/g;
const BODY_CLOSE = /<\/(?:[\w.-]+:)?FatturaElettronicaBody\s*>/g;

/**
 * Un file FatturaPA può contenere un lotto di fatture: un header e più
 * FatturaElettronicaBody. Restituisce un XML per ogni fattura (header + un solo
 * body), così ogni fattura del lotto si archivia e si visualizza come le altre.
 * Con un solo body restituisce [xmlString] invariato.
 * @param {string} xmlString
 * @returns {string[]}
 */
function splitFatturaLotto(xmlString) {
  const opens = [...xmlString.matchAll(BODY_OPEN)].map((m) => m.index);
  const closes = [...xmlString.matchAll(BODY_CLOSE)].map((m) => m.index + m[0].length);
  if (opens.length <= 1 || opens.length !== closes.length) return [xmlString];

  const head = xmlString.slice(0, opens[0]);
  const tail = xmlString.slice(closes[closes.length - 1]);
  return opens.map((start, i) => head + xmlString.slice(start, closes[i]) + tail);
}

// Elementi radice dei file di notifica/metadati SDI (_RC_, _NS_, _MT_, ...):
// non sono fatture e vanno ignorati all'import.
const SDI_NOTIFICATION_ROOTS = new Set([
  'RicevutaConsegna', 'NotificaScarto', 'NotificaMancataConsegna', 'NotificaEsito',
  'NotificaEsitoCommittente', 'ScartoEsitoCommittente', 'NotificaDecorrenzaTermini',
  'AttestazioneTrasmissioneFattura', 'MetadatiInvioFile', 'RicevutaImpossibilitaRecapito',
  'FileMetadati',
]);
// Nome file SDI delle notifiche: IT01234567890_abcde_MT_001.xml
const SDI_NOTIFICATION_FILENAME = /_(RC|NS|MC|NE|MT|EC|SE|DT|AT)_\d{3}\.xml(\.p7m)?$/i;

/**
 * true se il file è una notifica SDI (dal nome file o dall'elemento radice dell'XML).
 * @param {string} filename
 * @param {string} [xmlString]
 */
function isSdiNotification(filename, xmlString) {
  if (SDI_NOTIFICATION_FILENAME.test(filename)) return true;
  if (!xmlString) return false;
  const root = xmlString
    .replace(/<\?[\s\S]*?\?>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .match(/<(?:[\w.-]+:)?([\w.-]+)[\s>/]/);
  return !!root && SDI_NOTIFICATION_ROOTS.has(root[1]);
}

module.exports = { parseFatturaPA, splitFatturaLotto, isSdiNotification };
