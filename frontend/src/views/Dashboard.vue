<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">Dashboard</h1>

    <div v-if="loading" class="text-gray-500">Caricamento...</div>

    <template v-else-if="stats">
      <!-- Totals cards -->
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <StatCard label="Fatture passive" :value="stats.totals.total" color="green" />
        <StatCard label="Importo totale" :value="formatCurrency(stats.totals.total_amount)" />
      </div>

      <div class="grid md:grid-cols-2 gap-6 mb-8">

        <!-- Top fornitori -->
        <div class="bg-white rounded-lg shadow p-4">
          <h2 class="font-semibold mb-3 text-gray-700">Top fornitori</h2>
          <ul class="space-y-1 text-sm">
            <li v-for="s in stats.topSuppliers" :key="s.supplier_name" class="flex justify-between">
              <span class="truncate max-w-[200px]">{{ s.supplier_name }}</span>
              <span class="text-gray-500 ml-2">{{ s.count }} fatt.</span>
            </li>
            <li v-if="!stats.topSuppliers.length" class="text-gray-400 italic">Nessun dato</li>
          </ul>
        </div>
      </div>

      <!-- Per anno -->
      <div class="bg-white rounded-lg shadow p-4 mb-6">
        <h2 class="font-semibold mb-3 text-gray-700">Per anno</h2>
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left border-b text-gray-500">
              <th class="pb-2">Anno</th>
              <th class="pb-2">Fatture</th>
              <th class="pb-2">Importo</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in byYearRows" :key="row.year" class="border-b last:border-0 hover:bg-gray-50">
              <td class="py-2 font-medium">{{ row.year }}</td>
              <td class="py-2 text-green-600">{{ row.count || 0 }}</td>
              <td class="py-2">{{ formatCurrency(row.amount) }}</td>
            </tr>
            <tr v-if="!byYearRows.length"><td colspan="3" class="text-gray-400 italic py-2">Nessuna fattura</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Recent imports -->
      <div class="bg-white rounded-lg shadow p-4">
        <h2 class="font-semibold mb-3 text-gray-700">Importazioni recenti</h2>
        <ul class="divide-y text-sm">
          <li v-for="inv in stats.recentImports" :key="inv.id" class="py-2 flex justify-between items-center">
            <RouterLink :to="`/fatture/${inv.id}`" class="text-blue-600 hover:underline truncate max-w-xs">
              {{ inv.supplier_name || inv.buyer_name || inv.filename }}
            </RouterLink>
            <span class="text-gray-400 text-xs ml-4">{{ formatDate(inv.invoice_date) }}</span>
          </li>
          <li v-if="!stats.recentImports.length" class="py-2 text-gray-400 italic">Nessuna importazione</li>
        </ul>
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
    useGrouping: 'always',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(val);
}

function formatDate(d) {
  if (!d) return '';
  return d.slice(0, 10);
}
</script>
