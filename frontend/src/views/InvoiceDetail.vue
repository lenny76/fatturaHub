<template>
  <div>
    <div class="flex items-center gap-3 mb-6">
      <RouterLink to="/fatture" class="text-blue-600 hover:underline text-sm">← Elenco</RouterLink>
      <h1 class="text-xl font-bold">Dettaglio Fattura</h1>
    </div>

    <div v-if="loading" class="text-gray-500">Caricamento...</div>
    <div v-else-if="error" class="text-red-500">{{ error }}</div>

    <template v-else-if="invoice">
      <!-- Action bar -->
      <div class="flex gap-2 mb-4">
        <button @click="showXml = !showXml" class="btn-secondary text-sm">
          {{ showXml ? 'Visualizza renderizzata' : 'Visualizza XML' }}
        </button>
        <a :href="`/api/invoices/${invoice.id}/download`" class="btn-secondary text-sm">Download originale</a>
        <button @click="handleDelete" class="btn-danger text-sm">Elimina</button>
      </div>

      <div class="grid md:grid-cols-3 gap-4 mb-6">
        <!-- Invoice metadata -->
        <div class="md:col-span-1 bg-white rounded-lg shadow p-4 text-sm space-y-2">
          <InfoRow label="Numero" :value="invoice.invoice_number" />
          <InfoRow label="Data" :value="invoice.invoice_date?.slice(0,10)" />
          <InfoRow label="Tipo doc." :value="invoice.document_type" />
          <InfoRow label="Fornitore" :value="invoice.supplier_name" bold />
          <InfoRow label="P.IVA forn." :value="invoice.supplier_vat" />
          <InfoRow label="Cliente" :value="invoice.buyer_name" bold />
          <InfoRow label="P.IVA cliente" :value="invoice.buyer_vat" />
          <div class="border-t pt-2 mt-2">
            <InfoRow label="Imponibile" :value="formatCurrency(invoice.taxable_amount)" />
            <InfoRow label="IVA" :value="formatCurrency(invoice.tax_amount)" />
            <InfoRow label="Totale" :value="formatCurrency(invoice.total_amount)" bold />
          </div>
          <div class="text-xs text-gray-400 pt-2 border-t">
            Importato: {{ invoice.imported_at?.slice(0,16).replace('T',' ') }}
          </div>
        </div>

        <!-- Lines table -->
        <div class="md:col-span-2 bg-white rounded-lg shadow p-4">
          <h2 class="font-semibold text-sm text-gray-700 mb-3">Righe fattura</h2>
          <table class="w-full text-xs">
            <thead class="bg-gray-50 border-b">
              <tr>
                <th class="text-left px-2 py-1.5">Descrizione</th>
                <th class="text-right px-2 py-1.5">Qta</th>
                <th class="text-right px-2 py-1.5">P.unit.</th>
                <th class="text-right px-2 py-1.5">Totale</th>
                <th class="text-right px-2 py-1.5">IVA%</th>
              </tr>
            </thead>
            <tbody class="divide-y">
              <tr v-for="l in invoice.lines" :key="l.line_number">
                <td class="px-2 py-1.5">{{ l.description }}</td>
                <td class="px-2 py-1.5 text-right">{{ l.quantity }} {{ l.unit }}</td>
                <td class="px-2 py-1.5 text-right">{{ formatCurrency(l.unit_price) }}</td>
                <td class="px-2 py-1.5 text-right font-medium">{{ formatCurrency(l.total_price) }}</td>
                <td class="px-2 py-1.5 text-right">{{ l.vat_nature || (l.vat_rate != null ? l.vat_rate + '%' : '—') }}</td>
              </tr>
              <tr v-if="!invoice.lines.length">
                <td colspan="5" class="px-2 py-3 text-gray-400 italic text-center">Nessuna riga</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Invoice viewer (XSLT rendered or raw XML) -->
      <div class="bg-white rounded-lg shadow p-4">
        <h2 class="font-semibold text-sm text-gray-700 mb-3">Visualizzazione fattura</h2>
        <InvoiceViewer v-if="!showXml" :invoice-id="invoice.id" />
        <XmlViewer v-else :invoice-id="invoice.id" />
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '@/api';
import InvoiceViewer from '@/components/InvoiceViewer.vue';
import XmlViewer from '@/components/XmlViewer.vue';
import InfoRow from '@/components/InfoRow.vue';

const route = useRoute();
const router = useRouter();

const invoice = ref(null);
const loading = ref(true);
const error = ref(null);
const showXml = ref(false);

onMounted(async () => {
  try {
    const { data } = await api.get(`/invoices/${route.params.id}`);
    invoice.value = data;
  } catch (e) {
    error.value = 'Fattura non trovata';
  } finally {
    loading.value = false;
  }
});

async function handleDelete() {
  if (!confirm('Eliminare questa fattura?')) return;
  await api.delete(`/invoices/${invoice.value.id}`);
  router.push('/fatture');
}

function formatCurrency(val) {
  if (val == null) return '—';
  return new Intl.NumberFormat('it-IT', { 
    style: 'currency', 
    currency: 'EUR',
    useGrouping: 'always',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(val);
}
</script>

<style scoped>
.badge-blue { @apply text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full; }
.badge-green { @apply text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full; }
.btn-secondary { @apply bg-gray-100 text-gray-700 px-3 py-1.5 rounded text-sm font-medium hover:bg-gray-200; }
.btn-danger { @apply bg-red-100 text-red-700 px-3 py-1.5 rounded text-sm font-medium hover:bg-red-200; }
</style>
