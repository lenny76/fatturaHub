<template>
  <div class="h-full flex flex-col">
    <!-- Pannello allegati (sopra la fattura, fuori dalla catena v-if) -->
    <div
      v-if="!loading && attachments.length"
      class="flex-none border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3"
    >
      <div class="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
        Allegati ({{ attachments.length }})
      </div>
      <ul class="space-y-1.5">
        <li v-for="att in attachments" :key="att.index" class="flex items-center gap-2 text-xs">
          <!-- Badge formato -->
          <span class="flex-none px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 uppercase">
            {{ getFormato(att) || '?' }}
          </span>
          <!-- Nome file -->
          <span class="flex-1 truncate text-gray-700 dark:text-gray-200" :title="att.nome">
            {{ att.nome }}
          </span>
          <!-- Descrizione opzionale -->
          <span
            v-if="att.descrizione"
            class="flex-none text-gray-400 dark:text-gray-500 text-[10px] truncate max-w-[120px]"
            :title="att.descrizione"
          >
            {{ att.descrizione }}
          </span>
          <!-- Anteprima (solo formati supportati dal browser) -->
          <button
            v-if="PREVIEWABLE.has(getFormato(att).toUpperCase())"
            @click="previewAtt = att"
            :title="`Anteprima: ${att.nome}`"
            class="flex-none text-xs px-2 py-0.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
          >
            &#128065; Anteprima
          </button>
          <!-- Scarica -->
          <a
            :href="`/api/invoices/${props.invoiceId}/attachments/${att.index}/download`"
            target="_blank"
            class="flex-none text-xs px-2 py-0.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            :title="`Scarica ${att.nome}`"
          >
            &#x2B07; Scarica
          </a>
        </li>
      </ul>
    </div>

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
      ref="iframeRef"
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

  <!-- Modal anteprima allegato (Teleport a body per evitare clipping) -->
  <Teleport to="body">
    <div
      v-if="previewAtt"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      @click.self="previewAtt = null"
      @keydown.esc.window="previewAtt = null"
    >
      <div class="relative flex flex-col bg-white dark:bg-gray-900 rounded-lg shadow-xl w-[90vw] h-[90vh] max-w-5xl overflow-hidden">
        <!-- Header modal -->
        <div class="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex-none">
          <span class="text-sm font-medium text-gray-800 dark:text-gray-200 truncate mr-4">
            {{ previewAtt.nome }}
          </span>
          <div class="flex items-center gap-2 flex-none">
            <a
              :href="`/api/invoices/${props.invoiceId}/attachments/${previewAtt.index}/download`"
              target="_blank"
              class="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              &#x2B07; Scarica
            </a>
            <button
              @click="previewAtt = null"
              class="text-gray-500 hover:text-gray-900 dark:hover:text-white text-lg leading-none px-1"
            >
              &times;
            </button>
          </div>
        </div>

        <!-- Contenuto anteprima -->
        <div class="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-800">
          <!-- Caricamento blob -->
          <div v-if="!previewUrl" class="h-full flex items-center justify-center text-gray-400 text-sm">
            Caricamento...
          </div>
          <!-- Immagini -->
          <div
            v-else-if="['PNG','JPG','JPEG'].includes(getFormato(previewAtt).toUpperCase())"
            class="h-full flex items-center justify-center p-4"
          >
            <img :src="previewUrl" :alt="previewAtt.nome" class="max-h-full max-w-full object-contain" />
          </div>
          <!-- PDF, XML, TXT, CSV: blob URL → il browser renderizza senza header Content-Disposition -->
          <iframe
            v-else
            :src="previewUrl"
            class="w-full h-full border-0"
            :title="previewAtt.nome"
          />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import api from '@/api';

const iframeRef = ref(null);

const props = defineProps({
  invoiceId: [String, Number],
  mode: { type: String, default: 'semplificata' },
});

const rendered = ref('');
const iframeSrcDoc = ref('');
const loading = ref(true);
const error = ref(null);
const filename = ref('');
const attachments = ref([]);
const previewAtt = ref(null);
const previewUrl = ref(null);
const cachedXml = ref('');   // Blob URL per l'anteprima (evita interferenze Content-Disposition)

// Formati che il browser può visualizzare inline in iframe o <img>
const PREVIEWABLE = new Set(['PDF', 'PNG', 'JPG', 'JPEG', 'XML', 'TXT', 'CSV']);

// Restituisce il formato effettivo: FormatoAttachment se presente,
// altrimenti l'estensione del NomeAttachment (fallback per campi assenti)
function getFormato(att) {
  if (att.algoritmo === 'ZIP') return 'ZIP';
  if (att.formato) return att.formato;
  const m = att.nome.match(/\.([^.]+)$/);
  return m ? m[1] : '';
}

// getElementsByTagName is namespace-agnostic (unlike querySelector)
function getText(node, tag) {
  return node?.getElementsByTagName(tag)?.[0]?.textContent?.trim() || '';
}

function getAllElements(node, tag) {
  return [...(node?.getElementsByTagName(tag) || [])];
}

function parseAttachments(xmlString) {
  const doc = parseXmlWithNs(xmlString);
  return getAllElements(doc, 'Allegati').map((el, index) => ({
    index,
    nome: getText(el, 'NomeAttachment') || `allegato_${index}`,
    formato: getText(el, 'FormatoAttachment'),
    descrizione: getText(el, 'DescrizioneAttachment'),
    algoritmo: getText(el, 'AlgoritmoCompressione'),
  }));
}

async function render() {
  loading.value = true;
  error.value = null;
  iframeSrcDoc.value = '';
  rendered.value = '';
  cachedXml.value = '';
  attachments.value = [];
  previewAtt.value = null;

  try {
    const { data: invoice } = await api.get(`/invoices/${props.invoiceId}`);
    filename.value = invoice.filename || '';

    // Fetch XML per tutti i modi (serve anche per gli allegati in ministeriale)
    const { data: xmlString } = await api.get(`/invoices/${props.invoiceId}/xml`, { responseType: 'text' });
    cachedXml.value = xmlString;
    attachments.value = parseAttachments(xmlString);

    if (props.mode === 'ministeriale') {
      try {
        const res = await api.get(`/invoices/${props.invoiceId}/ministeriale`, { responseType: 'text' });
        iframeSrcDoc.value = res.data;
      } catch (e) {
        error.value = e.response?.data?.error || e.message;
      }
      return;
    }

    // Semplificata / Completa: custom HTML renderer
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

function buildHtml(xmlString, full, forPdf = false) {
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
    .sec{font-size:10px;font-weight:700;color:${forPdf ? '#222' : '#555'};margin:10px 0 3px;text-transform:uppercase;border-bottom:1px solid #ddd;padding-bottom:2px}
    .lbl{color:${forPdf ? '#444' : '#888'};font-size:10px}
    ${forPdf ? '' : `:root.dark .inv{color:#e5e7eb}
    :root.dark .t th{background:#374151;border-color:#4b5563;color:#d1d5db}
    :root.dark .t td{border-color:#374151}
    :root.dark .t tr{border-color:#374151}
    :root.dark .sec{color:#9ca3af;border-color:#374151}
    :root.dark .lbl{color:#6b7280}`}
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

function revokePreviewUrl() {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = null;
  }
}

// Quando cambia l'allegato in anteprima: fetcha il file e crea un Blob URL
// (i blob URL non hanno Content-Disposition → il browser renderizza direttamente il contenuto)
watch(previewAtt, async (att) => {
  revokePreviewUrl();
  if (!att) return;
  try {
    const res = await fetch(`/api/invoices/${props.invoiceId}/attachments/${att.index}/download`);
    const blob = await res.blob();
    previewUrl.value = URL.createObjectURL(blob);
  } catch (e) {
    console.error('[preview] fetch error:', e);
  }
});

function print() {
  if (!rendered.value) return;
  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Fattura</title></head><body style="margin:0;padding:16px">${rendered.value}</body></html>`);
  win.document.close();
  win.focus();
  win.print();
  win.close();
}

const pdfGenerating = ref(false);

async function generatePdf() {
  if (!cachedXml.value || pdfGenerating.value) return;
  pdfGenerating.value = true;
  try {
    const html2pdf = (await import('html2pdf.js')).default;
    const el = document.createElement('div');
    el.style.cssText = 'padding:8px;background:#fff;color:#1a1a1a;width:710px';
    // Build a PDF-optimised version: darker label/section colors, no dark-mode CSS
    el.innerHTML = buildHtml(cachedXml.value, props.mode === 'completa', true);
    document.body.appendChild(el);
    const pdfFilename = (filename.value || 'fattura').replace(/\.[^.]+$/, '') + '.pdf';
    await html2pdf().set({
      margin: 10,
      filename: pdfFilename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          clonedDoc.documentElement.classList.remove('dark');
        },
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    }).from(el).save();
    document.body.removeChild(el);
  } finally {
    pdfGenerating.value = false;
  }
}

defineExpose({ print, generatePdf, pdfGenerating });

onMounted(render);
onUnmounted(revokePreviewUrl);
watch(() => props.invoiceId, render);
watch(() => props.mode, render);
</script>
