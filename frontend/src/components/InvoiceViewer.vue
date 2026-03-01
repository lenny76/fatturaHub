<template>
  <div class="h-full flex flex-col">
    <div v-if="loading" class="flex-1 flex items-center justify-center text-gray-400 text-sm">
      Caricamento...
    </div>
    <div v-else-if="error" class="p-4 text-sm">
      <div v-if="filename" class="text-right text-gray-400 text-[10px] mb-2">{{ filename }}</div>
      <div class="text-red-500">{{ error }}</div>
    </div>
    <!-- Ministeriale: XSLT in iframe per rendering completo con CSS -->
    <iframe
      v-else-if="iframeSrcDoc"
      :srcdoc="iframeSrcDoc"
      class="flex-1 w-full border-0"
      sandbox="allow-scripts"
    />
    <!-- Semplificata / Completa: renderer custom -->
    <div v-else class="flex-1 overflow-auto p-3 text-xs">
      <div v-if="filename" class="text-right text-gray-400 text-[10px] mb-1">{{ filename }}</div>
      <div v-html="rendered" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import api from '@/api';

const props = defineProps({
  invoiceId: [String, Number],
  mode: { type: String, default: 'semplificata' },
});

const rendered = ref('');
const iframeSrcDoc = ref('');
const loading = ref(true);
const error = ref(null);
const filename = ref('');

// getElementsByTagName is namespace-agnostic (unlike querySelector)
function getText(node, tag) {
  return node?.getElementsByTagName(tag)?.[0]?.textContent?.trim() || '';
}

function getAllElements(node, tag) {
  return [...(node?.getElementsByTagName(tag) || [])];
}

async function render() {
  loading.value = true;
  error.value = null;
  iframeSrcDoc.value = '';
  rendered.value = '';

  try {
    const { data: invoice } = await api.get(`/invoices/${props.invoiceId}`);
    filename.value = invoice.filename || '';

    if (props.mode === 'ministeriale') {
      const res = await api.get(`/invoices/${props.invoiceId}/ministeriale`, { responseType: 'text' });
      iframeSrcDoc.value = res.data;
      return;
    }

    // Semplificata / Completa: custom HTML renderer
    const { data: xmlString } = await api.get(`/invoices/${props.invoiceId}/xml`, { responseType: 'text' });
    rendered.value = buildHtml(xmlString, props.mode === 'completa');
  } catch (e) {
    error.value = e.response?.data?.error || e.message;
  } finally {
    loading.value = false;
  }
}

function parseXmlWithNs(xmlString) {
  // Remove invalid XML characters (0x00-0x08, 0x0B, 0x0C, 0x0E-0x1F)
  const sanitized = xmlString.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  
  // Remove namespace prefixes from element names
  let stripped = sanitized
    .replace(/<(\w+):/g, '<')  // Remove namespace prefix from opening tags
    .replace(/<\/(\w+):/g, '</')  // Remove namespace prefix from closing tags
    
  // Remove xmlns declarations and namespace-prefixed attributes (like xsi:schemaLocation)
  stripped = stripped.replace(/\s+(\w+):(\w+)=/g, ' $2=');
  stripped = stripped.replace(/\s+xmlns(:\w+)?="[^"]*"/g, '');
  
  const parser = new DOMParser();
  return parser.parseFromString(stripped, 'application/xml');
}

function buildHtml(xmlString, full) {
  const doc = parseXmlWithNs(xmlString);
  
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error('XML non valido: ' + (parseError.textContent?.trim() || 'errore sconosciuto'));
  }

  const header = doc.getElementsByTagName('FatturaElettronicaHeader')[0] || doc;
  const body = doc.getElementsByTagName('FatturaElettronicaBody')[0] || doc;
  const datiGen = body.getElementsByTagName('DatiGenerali')[0] || body;
  const datiDoc = datiGen.getElementsByTagName('DatiGeneraliDocumento')[0] || datiGen;
  const cedente = header.getElementsByTagName('CedentePrestatore')[0] || header;
  const cessionario = header.getElementsByTagName('CessionarioCommittente')[0] || header;

  const supplierName = getText(cedente, 'Denominazione') ||
    `${getText(cedente, 'Nome')} ${getText(cedente, 'Cognome')}`.trim();
  const buyerName = getText(cessionario, 'Denominazione') ||
    `${getText(cessionario, 'Nome')} ${getText(cessionario, 'Cognome')}`.trim();

  // Line items
  const linesHtml = getAllElements(body, 'DettaglioLinee').map(l => `
    <tr>
      <td class="r">${getText(l, 'NumeroLinea')}</td>
      <td>${getText(l, 'Descrizione')}</td>
      ${full ? `<td class="r">${getText(l, 'Quantita')}</td><td>${getText(l, 'UnitaMisura')}</td><td class="r">${getText(l, 'PrezzoUnitario')}</td>` : ''}
      <td class="r fw">${getText(l, 'PrezzoTotale')}</td>
      <td class="r">${getText(l, 'AliquotaIVA')}%</td>
    </tr>`).join('');

  // VAT summary
  const riepilogoHtml = getAllElements(body, 'DatiRiepilogo').map(r => `
    <tr>
      <td class="r">${getText(r, 'AliquotaIVA')}%</td>
      <td class="r">${getText(r, 'ImponibileImporto')}</td>
      <td class="r fw">${getText(r, 'Imposta')}</td>
    </tr>`).join('');

  // Payments (completa only)
  const paymentsHtml = full
    ? getAllElements(body, 'DettaglioPagamento').map(p => `
      <tr>
        <td>${getText(p, 'ModalitaPagamento')}</td>
        <td class="r fw">${getText(p, 'ImportoPagamento')}</td>
        <td>${getText(p, 'DataScadenzaPagamento') || '—'}</td>
      </tr>`).join('')
    : '';

  return `<style>
    .inv{font-family:Arial,sans-serif;font-size:12px;color:#1a1a1a}
    .t{width:100%;border-collapse:collapse;margin-bottom:10px;font-size:11px}
    .t th{background:#eee;padding:3px 6px;border:1px solid #ccc;text-align:left;white-space:nowrap;font-size:10px}
    .t td{padding:3px 6px;border:1px solid #e0e0e0;vertical-align:top}
    .r{text-align:right}.fw{font-weight:600}
    .sec{font-size:10px;font-weight:700;color:#555;margin:10px 0 3px;text-transform:uppercase;border-bottom:1px solid #ddd;padding-bottom:2px}
    .lbl{color:#888;font-size:10px}
    :root.dark .inv{color:#e5e7eb}
    :root.dark .t th{background:#374151;border-color:#4b5563;color:#d1d5db}
    :root.dark .t td{border-color:#374151}
    :root.dark .t tr{border-color:#374151}
    :root.dark .sec{color:#9ca3af;border-color:#374151}
    :root.dark .lbl{color:#6b7280}
  </style>
  <div class="inv">
    <table class="t">
      <tr>
        <td style="width:50%;vertical-align:top">
          <div class="lbl">Fornitore</div>
          <strong>${supplierName}</strong><br>
          <span class="lbl">P.IVA: ${getText(cedente, 'IdCodice')} — CF: ${getText(cedente, 'CodiceFiscale')}</span>
        </td>
        <td style="vertical-align:top">
          <div class="lbl">Cliente</div>
          <strong>${buyerName}</strong><br>
          <span class="lbl">P.IVA: ${getText(cessionario, 'IdCodice')} — CF: ${getText(cessionario, 'CodiceFiscale')}</span>
        </td>
      </tr>
      <tr>
        <td>N. <strong>${getText(datiDoc, 'Numero')}</strong> del <strong>${getText(datiDoc, 'Data')}</strong></td>
        <td>Tipo: <strong>${getText(datiDoc, 'TipoDocumento')}</strong> &nbsp; Valuta: <strong>${getText(datiDoc, 'Divisa') || 'EUR'}</strong></td>
      </tr>
    </table>

    <div class="sec">Righe</div>
    <table class="t">
      <tr>
        <th class="r">#</th>
        <th>Descrizione</th>
        ${full ? '<th class="r">Qtà</th><th>U.M.</th><th class="r">P.Unit.</th>' : ''}
        <th class="r">Totale</th>
        <th class="r">IVA%</th>
      </tr>
      ${linesHtml || '<tr><td colspan="7" style="color:#aaa;padding:8px">Nessuna riga</td></tr>'}
    </table>

    ${riepilogoHtml ? `<div class="sec">Riepilogo IVA</div>
    <table class="t">
      <tr><th class="r">Aliq.%</th><th class="r">Imponibile</th><th class="r">Imposta</th></tr>
      ${riepilogoHtml}
    </table>` : ''}

    <div style="text-align:right;margin-top:8px;font-size:13px;border-top:2px solid #ccc;padding-top:6px">
      Totale documento: <strong>${getText(datiDoc, 'ImportoTotaleDocumento')}</strong>
    </div>

    ${full && paymentsHtml ? `<div class="sec" style="margin-top:10px">Pagamento</div>
    <table class="t">
      <tr><th>Modalità</th><th class="r">Importo</th><th>Scadenza</th></tr>
      ${paymentsHtml}
    </table>` : ''}
  </div>`;
}

onMounted(render);
watch(() => props.invoiceId, render);
watch(() => props.mode, render);
</script>
