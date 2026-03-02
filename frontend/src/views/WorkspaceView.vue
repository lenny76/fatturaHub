<template>
  <div class="flex flex-1 min-h-0 overflow-hidden w-full relative">

    <!-- Backdrop sidebar (mobile) -->
    <div
      v-if="showSidebar"
      class="absolute inset-0 bg-black/40 z-20 lg:hidden"
      @click="showSidebar = false"
    />

    <!-- ── Pannello sinistro: Fornitori ── -->
    <aside
      class="flex-none flex flex-col bg-gray-50 dark:bg-gray-800 border-r border-gray-300 dark:border-gray-700 overflow-hidden min-h-0
             transition-transform duration-200 shadow-lg
             absolute left-0 top-0 bottom-0 z-30 w-64
             lg:relative lg:inset-auto lg:z-auto lg:w-52 lg:shadow-none lg:translate-x-0"
      :class="showSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'"
    >
      <div class="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <span>Fornitori</span>
        <button class="lg:hidden text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" @click="showSidebar = false">✕</button>
      </div>
      <div class="px-2 py-1.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <input
          v-model="supplierSearch"
          type="text"
          placeholder="Cerca fornitore…"
          class="w-full text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-500 focus:outline-none focus:border-blue-400"
        />
      </div>
      <div class="flex-1 overflow-y-auto">
        <ul>
          <li
            @click="filterBySupplier(''); showSidebar = false"
            :class="activeSupplier === '' ? 'bg-blue-600 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'"
            class="px-3 py-1.5 text-xs cursor-pointer flex justify-between items-center"
          >
            <span>Tutti</span>
            <span :class="activeSupplier === '' ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300'" class="rounded-full px-1.5 py-0.5 text-xs font-medium">
              {{ store.total }}
            </span>
          </li>
          <li
            v-for="s in filteredSupplierList" :key="s.name"
            @click="filterBySupplier(s.name); showSidebar = false"
            :class="activeSupplier === s.name ? 'bg-blue-600 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'"
            class="px-3 py-1.5 text-xs cursor-pointer flex justify-between items-center"
            :title="s.name"
          >
            <span class="truncate max-w-[180px]">{{ s.name }}</span>
            <span :class="activeSupplier === s.name ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300'" class="rounded-full px-1.5 py-0.5 text-xs font-medium flex-none ml-1">
              {{ s.count }}
            </span>
          </li>
        </ul>
      </div>
    </aside>

    <!-- ── Pannello centrale: Lista fatture ── -->
    <div
      class="flex-col overflow-hidden border-r border-gray-300 dark:border-gray-700 lg:flex lg:w-[560px] lg:flex-none"
      :class="selectedId ? 'hidden' : 'flex'"
    >
      <!-- Barra mobile: hamburger + filtro attivo -->
      <div class="flex items-center gap-2 px-2 py-1.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 lg:hidden">
        <button
          @click="showSidebar = true"
          class="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          ☰ Fornitori
        </button>
        <span v-if="activeSupplier" class="text-xs text-blue-600 truncate flex-1">{{ activeSupplier }}</span>
      </div>

      <div v-if="store.loading" class="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
        Caricamento...
      </div>
      <div v-else class="flex-1 overflow-y-auto">
        <table class="w-full text-xs border-collapse">
          <thead class="sticky top-0 z-10">
            <tr class="bg-gray-200 dark:bg-gray-700 border-b border-gray-300 dark:border-gray-600">
              <th class="col-th" @click="toggleSort('invoice_date')">Data {{ sortInd('invoice_date') }}</th>
              <th class="col-th hidden sm:table-cell">N.</th>
              <th class="col-th" @click="toggleSort('supplier_name')">Fornitore {{ sortInd('supplier_name') }}</th>
              <th class="col-th text-right" @click="toggleSort('total_amount')">Importo {{ sortInd('total_amount') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="inv in store.list" :key="inv.id"
              @click="selectInvoice(inv.id)"
              :class="selectedId === inv.id ? 'bg-blue-600 text-white' : 'hover:bg-blue-50 dark:hover:bg-gray-700 dark:text-gray-200'"
              class="border-b border-gray-200 dark:border-gray-700 cursor-pointer"
            >
              <td class="col-td font-mono">{{ inv.invoice_date?.slice(0,10) }}</td>
              <td class="col-td font-mono hidden sm:table-cell" :class="selectedId === inv.id ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'">{{ inv.invoice_number }}</td>
              <td class="col-td truncate max-w-[100px] sm:max-w-[160px]">{{ inv.supplier_name }}</td>
              <td class="col-td font-medium tabular-nums">
                <div class="flex items-center justify-end">
                  {{ formatCurrency(inv.total_amount) }}
                  <span class="w-4 flex-none flex justify-center ml-1">
                    <span
                      v-if="inv.has_attachments"
                      title="Ha allegati"
                      :class="selectedId === inv.id ? 'text-blue-200' : 'text-gray-400 dark:text-gray-500'"
                      class="text-[11px] leading-none"
                    >📎</span>
                  </span>
                </div>
              </td>
            </tr>
            <tr v-if="!store.list.length">
              <td colspan="4" class="col-td text-center text-gray-400 dark:text-gray-500 italic py-8">Nessuna fattura</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination bar -->
      <div class="flex-none flex items-center justify-between px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border-t border-gray-300 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
        <span>{{ store.total }} fatture — pag. {{ store.filters.page }}/{{ totalPages }}</span>
        <div class="flex gap-1">
          <button :disabled="store.filters.page <= 1" @click="changePage(-1)" class="pag-btn">‹</button>
          <button :disabled="store.filters.page >= totalPages" @click="changePage(1)" class="pag-btn">›</button>
        </div>
      </div>
    </div>

    <!-- ── Pannello destra: Viewer ── -->
    <div
      class="flex-col overflow-hidden bg-white dark:bg-gray-900 lg:flex lg:flex-1"
      :class="selectedId ? 'flex absolute inset-0 z-10 lg:relative lg:inset-auto lg:z-auto' : 'hidden'"
    >
      <template v-if="selectedId">
        <!-- Viewer toolbar -->
        <div class="flex-none flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700">
          <!-- Indietro (mobile) -->
          <button @click="selectedId = null" class="lg:hidden action-btn">
            ← Indietro
          </button>

          <!-- Selettore modalità: button-group su desktop, select su mobile -->
          <div class="hidden lg:flex rounded overflow-hidden border border-gray-300 dark:border-gray-600 text-xs">
            <button
              v-for="m in viewModes" :key="m.val"
              @click="viewMode = m.val"
              :class="viewMode === m.val ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'"
              class="px-2 py-1 transition-colors border-r border-gray-300 dark:border-gray-600 last:border-0"
            >{{ m.label }}</button>
          </div>
          <select v-model="viewMode" class="lg:hidden text-xs border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200">
            <option v-for="m in viewModes" :key="m.val" :value="m.val">{{ m.label }}</option>
          </select>

          <div class="flex-1" />
          <button @click="toggleXml" :title="showXml ? 'Visualizza fattura' : 'Visualizza XML originale'" class="action-btn">{{ showXml ? '📄' : '</>' }}</button>
          <a :href="`/api/invoices/${selectedId}/download`" title="Scarica file originale" class="action-btn">⬇</a>
          <button @click="deleteSelected" title="Elimina fattura" class="action-btn text-red-600 hover:bg-red-50">🗑</button>
        </div>

        <div class="flex-1 overflow-auto p-2 sm:p-4">
          <XmlViewer v-if="showXml" :invoice-id="selectedId" />
          <InvoiceViewer v-else :invoice-id="selectedId" :mode="viewMode" />
        </div>
      </template>

      <div v-else class="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
        ← Seleziona una fattura per visualizzarla
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';

import { useInvoicesStore } from '@/stores/invoices';
import InvoiceViewer from '@/components/InvoiceViewer.vue';
import XmlViewer from '@/components/XmlViewer.vue';
import api from '@/api';

const store = useInvoicesStore();
const selectedId = ref(null);
const showXml = ref(false);
const viewMode = ref(localStorage.getItem('viewMode') || 'semplificata');
watch(viewMode, (val) => localStorage.setItem('viewMode', val));
const activeSupplier = ref('');
const supplierList = ref([]);
const showSidebar = ref(false);
const supplierSearch = ref('');

const filteredSupplierList = computed(() => {
  const q = supplierSearch.value.trim().toLowerCase();
  if (!q) return supplierList.value;
  return supplierList.value.filter(s => s.name.toLowerCase().includes(q));
});

const viewModes = [
  { val: 'semplificata', label: 'Semplificata' },
  { val: 'completa', label: 'Completa' },
];

const totalPages = computed(() => Math.max(1, Math.ceil(store.total / store.filters.limit)));

async function fetchParties() {
  try {
    supplierList.value = await store.fetchParties();
  } catch (e) {
    console.error('fetchParties error:', e);
  }
}

onMounted(fetchParties);
watch(() => store.filters.years, fetchParties);
watch(() => store.filters.months, fetchParties);
watch(() => store.filters.q, fetchParties);
watch(() => store.filters.supplier, fetchParties);

watch(() => store.list, () => {
  if (selectedId.value && !store.list.find(i => i.id === selectedId.value)) {
    selectedId.value = null;
  }
  fetchParties();
});

function selectInvoice(id) {
  selectedId.value = selectedId.value === id ? null : id;
  showXml.value = false;
}

function toggleXml() { showXml.value = !showXml.value; }

async function deleteSelected() {
  if (!selectedId.value || !confirm('Eliminare questa fattura?')) return;
  await store.deleteInvoice(selectedId.value);
  selectedId.value = null;
}

async function filterBySupplier(name) {
  activeSupplier.value = name;
  store.setFilter('supplier', name);
  store.setFilter('page', 1);
  await store.fetchList();
}

async function changePage(delta) {
  store.filters.page += delta;
  await store.fetchList();
}

async function toggleSort(field) {
  store.filters.sort === field
    ? (store.filters.order = store.filters.order === 'ASC' ? 'DESC' : 'ASC')
    : ((store.filters.sort = field), (store.filters.order = 'DESC'));
  await store.fetchList();
}

function sortInd(field) {
  if (store.filters.sort !== field) return '';
  return store.filters.order === 'ASC' ? '↑' : '↓';
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
.col-th { @apply px-2 py-2 text-left font-semibold text-gray-600 dark:text-gray-400 text-xs cursor-pointer select-none whitespace-nowrap; }
.col-td { @apply px-2 py-1.5; }
.pag-btn { @apply px-2 py-0.5 bg-white dark:bg-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed; }
.action-btn { @apply text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer; }
</style>
