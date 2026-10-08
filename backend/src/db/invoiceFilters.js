/**
 * Filtri condivisi da lista fatture, sidebar fornitori e barra totali:
 * stessi parametri → stesso insieme di fatture, così conteggi e totali coincidono.
 */

// Note di credito: nell'XML gli importi sono positivi, ma nei totali vanno sottratti.
// -ABS gestisce anche le (rare) note di credito emesse già con importi negativi.
const CREDIT_NOTE_TYPES = ['TD04', 'TD08'];
const CREDIT_NOTE_SQL = CREDIT_NOTE_TYPES.map((t) => `'${t}'`).join(',');

/** Espressione SQL dell'importo con segno (negativo per le note di credito). */
function signedAmount(col) {
  return `(CASE WHEN document_type IN (${CREDIT_NOTE_SQL}) THEN -ABS(${col}) ELSE ${col} END)`;
}

function intList(str, min, max) {
  if (!str) return [];
  return String(str)
    .split(',')
    .map((v) => parseInt(v, 10))
    .filter((v) => !isNaN(v) && v >= min && v <= max);
}

/**
 * @param {object} query - q, amount, years, months, docType, supplierKey
 * @returns {{ where: string, params: any[] }}
 */
function buildInvoiceFilters(query) {
  const { q, amount, years, months, docType, supplierKey } = query;
  const conditions = ["direction = 'passiva'"];
  const params = [];

  const term = q ? String(q).trim().replace(/"/g, '') : '';
  if (term) {
    conditions.push('id IN (SELECT invoice_id FROM invoice_fts WHERE invoice_fts MATCH ?)');
    params.push(`"${term}"*`);
  }

  const yearsArr = intList(years, 1900, 2999);
  if (yearsArr.length) {
    conditions.push(`year IN (${yearsArr.map(() => '?').join(',')})`);
    params.push(...yearsArr);
  }

  const monthsArr = intList(months, 1, 12);
  if (monthsArr.length) {
    conditions.push(`month IN (${monthsArr.map(() => '?').join(',')})`);
    params.push(...monthsArr);
  }

  if (docType) { conditions.push('document_type = ?'); params.push(docType); }
  if (supplierKey) { conditions.push('supplier_key = ?'); params.push(supplierKey); }

  // Importo cercato senza segno: trova anche le note di credito salvate con importi negativi
  const amountVal = amount ? parseFloat(amount) : NaN;
  if (!isNaN(amountVal)) {
    conditions.push('(ABS(ABS(total_amount) - ?) < 0.005 OR ABS(ABS(taxable_amount) - ?) < 0.005)');
    params.push(amountVal, amountVal);
  }

  return { where: 'WHERE ' + conditions.join(' AND '), params };
}

const VALID_SORTS = ['invoice_date', 'supplier_name', 'buyer_name', 'total_amount', 'invoice_number', 'imported_at'];

function orderBy(sort, order) {
  const safeSort = VALID_SORTS.includes(sort) ? sort : 'invoice_date';
  const safeOrder = String(order).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  return `ORDER BY ${safeSort} ${safeOrder}, id ${safeOrder}`;
}

/**
 * Lista paginata delle fatture (GET /api/invoices e GET /api/search).
 */
function listInvoices(db, query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(500, Math.max(1, parseInt(query.limit, 10) || 50));
  const { where, params } = buildInvoiceFilters(query);

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM invoices ${where}`).get(params).cnt;
  const data = db.prepare(`
    SELECT id, filename, file_type, direction, transmission_format,
           supplier_name, buyer_name,
           invoice_number, invoice_date, document_type, year,
           total_amount, taxable_amount, tax_amount, imported_at, has_attachments
    FROM invoices ${where}
    ${orderBy(query.sort, query.order)}
    LIMIT ? OFFSET ?
  `).all(...params, limit, (page - 1) * limit);

  return { total, page, limit, data };
}

module.exports = { CREDIT_NOTE_TYPES, signedAmount, buildInvoiceFilters, listInvoices };
