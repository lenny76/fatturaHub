import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/api';

export const useInvoicesStore = defineStore('invoices', () => {
  const list = ref([]);
  const total = ref(0);
  const loading = ref(false);
  const stats = ref(null);

  // Filters
  const filters = ref({
    direction: 'passiva',
    years: '',
    months: '',
    docType: '',
    supplier: '',
    buyer: '',
    q: '',
    amount: '',
    page: 1,
    limit: 50,
    sort: 'invoice_date',
    order: 'ASC',
  });

  const years = computed(() => stats.value?.years || []);
  const docTypes = computed(() => stats.value?.docTypes || []);

  async function fetchList() {
    loading.value = true;
    try {
      const params = { ...filters.value };
      // Use search endpoint when text query or supplier/buyer filter is set
      const useSearch = params.q || params.amount || params.supplier || params.buyer;
      const endpoint = useSearch ? '/search' : '/invoices';
      const { data } = await api.get(endpoint, { params });
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
    const params = { years: filters.value.years, months: filters.value.months };
    if (filters.value.q) params.q = filters.value.q;
    const { data } = await api.get('/invoices/parties', { params });
    return data.suppliers;
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
    filters.value = { direction: 'passiva', years: '', months: '', docType: '', supplier: '', buyer: '', q: '', amount: '', page: 1, limit: 50, sort: 'invoice_date', order: 'ASC' };
  }

  return { list, total, loading, filters, stats, years, docTypes, fetchList, fetchStats, fetchParties, deleteInvoice, setFilter, resetFilters };
});
