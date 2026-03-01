<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">Fatture</h1>
      <RouterLink to="/carica" class="btn-primary">+ Carica</RouterLink>
    </div>

    <!-- Filter bar -->
    <div class="bg-white rounded-lg shadow p-4 mb-4 flex flex-wrap gap-3 items-end">
      <div class="flex-1 min-w-[200px]">
        <label class="filter-label">Ricerca testo</label>
        <input v-model="localQ" @keyup.enter="applySearch" type="text"
          placeholder="Fornitore, descrizione, ragione sociale..."
          class="input w-full" />
      </div>
      <div>
        <label class="filter-label">Anno</label>
        <select v-model="localYear" class="input">
          <option value="">Tutti</option>
          <option v-for="y in store.years" :key="y" :value="y">{{ y }}</option>
        </select>
      </div>
      <div>
        <label class="filter-label">Tipo doc.</label>
        <select v-model="localDocType" class="input">
          <option value="">Tutti</option>
          <option v-for="t in store.docTypes" :key="t" :value="t">{{ t }}</option>
        </select>
      </div>
      <div class="flex gap-2">
        <button @click="applySearch" class="btn-primary">Cerca</button>
        <button @click="resetAll" class="btn-secondary">Reset</button>
      </div>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-lg shadow overflow-x-auto">
      <div v-if="store.loading" class="p-8 text-center text-gray-400">Caricamento...</div>
      <template v-else>
        <div class="px-4 py-2 text-sm text-gray-500 border-b">
          {{ store.total }} fatture trovate
        </div>
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b">
            <tr>
              <th class="th" @click="toggleSort('invoice_date')">Data {{ sortIndicator('invoice_date') }}</th>
              <th class="th">N. Fattura</th>
              <th class="th" @click="toggleSort('supplier_name')">Fornitore {{ sortIndicator('supplier_name') }}</th>
              <th class="th">Doc.</th>
              <th class="th text-right" @click="toggleSort('total_amount')">Importo {{ sortIndicator('total_amount') }}</th>
              <th class="th text-center">Azioni</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <tr v-for="inv in store.list" :key="inv.id" class="hover:bg-gray-50 cursor-pointer"
              @click="$router.push(`/fatture/${inv.id}`)">
              <td class="td">{{ inv.invoice_date?.slice(0,10) }}</td>
              <td class="td font-mono text-xs">{{ inv.invoice_number }}</td>
              <td class="td truncate max-w-[220px]">{{ inv.supplier_name }}</td>
              <td class="td text-gray-500 text-xs">{{ inv.document_type }}</td>
              <td class="td text-right font-medium">{{ formatCurrency(inv.total_amount) }}</td>
              <td class="td text-center" @click.stop>
                <button @click="handleDelete(inv)" class="text-red-500 hover:text-red-700 text-xs">Elimina</button>
              </td>
            </tr>
            <tr v-if="!store.list.length">
              <td colspan="6" class="td text-center text-gray-400 italic py-8">Nessuna fattura trovata</td>
            </tr>
          </tbody>
        </table>

        <!-- Pagination -->
        <div class="flex items-center justify-between px-4 py-3 border-t text-sm text-gray-500">
          <span>Pagina {{ store.filters.page }} di {{ totalPages }}</span>
          <div class="flex gap-2">
            <button :disabled="store.filters.page <= 1" @click="changePage(-1)" class="btn-secondary disabled:opacity-40">← Prec</button>
            <button :disabled="store.filters.page >= totalPages" @click="changePage(1)" class="btn-secondary disabled:opacity-40">Succ →</button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useInvoicesStore } from '@/stores/invoices';

const store = useInvoicesStore();

const localQ = ref('');
const localYear = ref('');
const localDocType = ref('');

const totalPages = computed(() => Math.max(1, Math.ceil(store.total / store.filters.limit)));

onMounted(async () => {
  await store.fetchStats();
  syncFromStore();
  await store.fetchList();
});

function syncFromStore() {
  localQ.value = store.filters.q;
  localYear.value = store.filters.year;
  localDocType.value = store.filters.docType;
}

async function applySearch() {
  store.filters.q = localQ.value;
  store.filters.year = localYear.value;
  store.filters.docType = localDocType.value;
  store.filters.page = 1;
  await store.fetchList();
}

async function resetAll() {
  store.resetFilters();
  syncFromStore();
  await store.fetchList();
}

async function changePage(delta) {
  store.filters.page += delta;
  await store.fetchList();
}

function sortIndicator(field) {
  if (store.filters.sort !== field) return '';
  return store.filters.order === 'ASC' ? '↑' : '↓';
}

async function toggleSort(field) {
  if (store.filters.sort === field) {
    store.filters.order = store.filters.order === 'ASC' ? 'DESC' : 'ASC';
  } else {
    store.filters.sort = field;
    store.filters.order = 'DESC';
  }
  await store.fetchList();
}

async function handleDelete(inv) {
  if (!confirm(`Eliminare la fattura "${inv.filename}"?`)) return;
  await store.deleteInvoice(inv.id);
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

<style>
.th { @apply px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none; }
.td { @apply px-4 py-3; }
.filter-label { @apply block text-xs text-gray-500 mb-1; }
.input { @apply border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500; }
.btn-primary { @apply bg-blue-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-blue-700 transition-colors; }
.btn-secondary { @apply bg-gray-100 text-gray-700 px-4 py-1.5 rounded text-sm font-medium hover:bg-gray-200 transition-colors; }
.badge-blue { @apply text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full; }
.badge-green { @apply text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full; }
</style>
