import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/api';

const DEFAULT_FILTERS = {
  direction: 'passiva',
  years: '',
  months: '',
  docType: '',
  supplierKey: '',
  q: '',
  amount: '',
  page: 1,
  limit: 50,
  sort: 'invoice_date',
  order: 'ASC',
};

export const useInvoicesStore = defineStore('invoices', () => {
  const list = ref([]);
  const total = ref(0);
  const loading = ref(false);
  const stats = ref(null);

  // Filters
  const filters = ref({ ...DEFAULT_FILTERS });

  const years = computed(() => stats.value?.years || []);
  const docTypes = computed(() => stats.value?.docTypes || []);

  // Filtri che definiscono l'insieme di fatture: condivisi da lista, sidebar fornitori
  // e barra totali, così conteggi e importi coincidono sempre
  function filterParams({ withSupplier = true } = {}) {
    const { years, months, docType, supplierKey, q, amount } = filters.value;
    const params = {};
    if (years) params.years = years;
    if (months) params.months = months;
    if (docType) params.docType = docType;
    if (q) params.q = q;
    if (amount) params.amount = amount;
    if (withSupplier && supplierKey) params.supplierKey = supplierKey;
    return params;
  }

  async function fetchList() {
    loading.value = true;
    try {
      const { page, limit, sort, order } = filters.value;
      const { data } = await api.get('/invoices', { params: { ...filterParams(), page, limit, sort, order } });
      list.value = data.data;
      total.value = data.total;
    } finally {
      loading.value = false;
    }
  }

  async function fetchStats() {
    const { data } = await api.get('/stats');
    stats.value = data;
  }

  async function fetchParties() {
    const { data } = await api.get('/invoices/parties', { params: filterParams({ withSupplier: false }) });
    return data.suppliers;
  }

  async function fetchAnalysis() {
    const { data } = await api.get('/stats/analysis', { params: filterParams() });
    return data;
  }

  async function deleteInvoice(id) {
    await api.delete(`/invoices/${id}`);
    list.value = list.value.filter(i => i.id !== id);
    total.value -= 1;
  }

  function setFilter(key, value) {
    filters.value[key] = value;
    filters.value.page = 1;
  }

  function resetFilters() {
    filters.value = { ...DEFAULT_FILTERS };
  }

  return { list, total, loading, filters, stats, years, docTypes, fetchList, fetchStats, fetchParties, fetchAnalysis, deleteInvoice, setFilter, resetFilters };
});
