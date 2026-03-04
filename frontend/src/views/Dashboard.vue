<template>
  <div class="flex-1 overflow-y-auto p-6 bg-gray-100 dark:bg-gray-900">

    <!-- Header -->
    <div class="flex items-center gap-3 mb-6">
      <RouterLink
        to="/"
        class="flex items-center gap-1 px-2.5 py-1.5 rounded text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-gray-800 transition-colors"
        title="Torna alle fatture"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
        </svg>
        Fatture
      </RouterLink>
      <span class="text-gray-300 dark:text-gray-600">/</span>
      <h1 class="text-lg font-bold text-gray-800 dark:text-white">Dashboard</h1>
    </div>

    <div v-if="loading" class="text-gray-500 dark:text-gray-400">Caricamento...</div>

    <template v-else-if="stats">
      <!-- Stat cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Fatture passive" :value="stats.totals.total" color="green" />
        <StatCard label="Importo totale" :value="formatCurrency(stats.totals.total_amount)" />
        <StatCard label="Anni" :value="stats.years.length" color="blue" />
      </div>

      <!-- Top fornitori + Importazioni recenti -->
      <div class="grid md:grid-cols-2 gap-6 mb-6">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h2 class="font-semibold mb-3 text-gray-700 dark:text-gray-200">Top fornitori</h2>
          <ul class="space-y-1.5 text-sm">
            <li v-for="s in stats.topSuppliers" :key="s.supplier_name" class="flex justify-between items-center gap-2">
              <span class="truncate text-gray-700 dark:text-gray-300">{{ s.supplier_name }}</span>
              <span class="shrink-0 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded px-1.5 py-0.5">{{ s.count }}</span>
            </li>
            <li v-if="!stats.topSuppliers.length" class="text-gray-400 dark:text-gray-500 italic">Nessun dato</li>
          </ul>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h2 class="font-semibold mb-3 text-gray-700 dark:text-gray-200">Importazioni recenti</h2>
          <ul class="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
            <li v-for="inv in stats.recentImports" :key="inv.id" class="py-1.5 flex justify-between items-center gap-2">
              <span class="truncate text-gray-700 dark:text-gray-300">{{ inv.supplier_name || inv.filename }}</span>
              <span class="shrink-0 text-gray-400 dark:text-gray-500 text-xs">{{ formatDate(inv.invoice_date) }}</span>
            </li>
            <li v-if="!stats.recentImports.length" class="py-2 text-gray-400 dark:text-gray-500 italic">Nessuna importazione</li>
          </ul>
        </div>
      </div>

      <!-- Per anno -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h2 class="font-semibold mb-3 text-gray-700 dark:text-gray-200">Per anno</h2>
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
              <th class="pb-2">Anno</th>
              <th class="pb-2">Fatture</th>
              <th class="pb-2 text-right">Importo</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in byYearRows"
              :key="row.year"
              class="border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <td class="py-2 font-medium text-gray-800 dark:text-gray-200">{{ row.year }}</td>
              <td class="py-2 text-green-600 dark:text-green-400">{{ row.count || 0 }}</td>
              <td class="py-2 text-right text-gray-700 dark:text-gray-300">{{ formatCurrency(row.amount) }}</td>
            </tr>
            <tr v-if="!byYearRows.length">
              <td colspan="3" class="text-gray-400 dark:text-gray-500 italic py-2">Nessuna fattura</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useInvoicesStore } from '@/stores/invoices';
import StatCard from '@/components/StatCard.vue';

const store = useInvoicesStore();
const loading = ref(true);
const stats = computed(() => store.stats);

onMounted(async () => {
  await store.fetchStats();
  loading.value = false;
});

const byYearRows = computed(() => stats.value?.byYear ?? []);

function formatCurrency(val) {
  if (val == null) return '—';
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(val);
}

function formatDate(d) {
  if (!d) return '';
  return d.slice(0, 10);
}
</script>
