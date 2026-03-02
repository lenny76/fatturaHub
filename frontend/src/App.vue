<template>
  <div class="h-screen flex flex-col overflow-hidden bg-gray-100 dark:bg-gray-900" @click="showSettings = false">

    <!-- ── Toolbar ── -->
    <header class="flex-none bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm z-20">
      <!-- Prima riga -->
      <div class="h-12 flex items-center gap-2 px-3">
        <span class="font-bold text-base tracking-tight text-gray-800 dark:text-white mr-2">FatturaHub</span>

        <!-- Ricerca -->
        <div class="flex items-center bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-2 gap-1">
          <span class="text-gray-400 text-xs">🔍</span>
          <input
            v-model="searchQ"
            @keyup.enter="doSearch"
            type="text"
            placeholder="Cerca..."
            class="bg-transparent text-gray-800 dark:text-white text-xs outline-none w-24 sm:w-36 md:w-44 placeholder-gray-400"
          />
          <button v-if="searchQ" @click="clearSearch" class="text-gray-400 hover:text-gray-600 dark:hover:text-white">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="flex-1" />

        <!-- Carica -->
        <button @click="showUpload = true" class="toolbar-btn" title="Carica fatture">
          📂 <span class="ml-1 text-xs hidden sm:inline">Carica</span>
        </button>

        <span class="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">{{ store.total }} fatture</span>

        <!-- Toggle dark/light -->
        <button @click="toggleDark" class="toolbar-btn" :title="isDark ? 'Passa a tema chiaro' : 'Passa a tema scuro'">
          <!-- luna: sei in tema scuro -->
          <svg v-if="isDark" class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
          <!-- sole: sei in tema chiaro -->
          <svg v-else class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd" />
          </svg>
        </button>

        <div class="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-1" />

        <!-- Impostazioni -->
        <div class="relative" @click.stop>
          <button
            @click="showSettings = !showSettings"
            class="toolbar-btn"
            :class="showSettings ? 'bg-gray-100 dark:bg-gray-600' : ''"
            title="Impostazioni"
          >
            ⚙️ <span class="ml-1 text-xs hidden sm:inline">Impostazioni</span>
          </button>
          <div
            v-if="showSettings"
            class="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-gray-800 rounded shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50"
          >
            <div class="px-3 py-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide border-b border-gray-100 dark:border-gray-700">
              Impostazioni
            </div>
            <button
              @click="resetAllData"
              class="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              🗑 Elimina tutti i dati
            </button>
          </div>
        </div>
      </div>

      <!-- Seconda riga: Filtri -->
      <div class="h-8 flex items-center gap-1 px-3 border-t border-gray-200 dark:border-gray-700 overflow-x-auto">
        <!-- Anni -->
        <button
          @click="toggleYear(null)"
          class="filter-btn"
          :class="selectedYears.length === 0 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600'"
        >
          Tutti
        </button>
        <button
          v-for="y in store.years"
          :key="y"
          @click="toggleYear(y)"
          class="filter-btn"
          :class="selectedYears.includes(y) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600'"
        >
          {{ y }}
        </button>

        <div class="w-px h-4 bg-gray-200 dark:bg-gray-600 mx-2" />

        <!-- Mesi -->
        <button
          @click="toggleMonth(null)"
          class="filter-btn"
          :class="selectedMonths.length === 0 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600'"
        >
          Tutti
        </button>
        <button
          v-for="(m, idx) in months"
          :key="idx"
          @click="toggleMonth(idx + 1)"
          class="filter-btn"
          :class="selectedMonths.includes(idx + 1) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600'"
        >
          {{ m }}
        </button>
      </div>
    </header>

    <!-- ── Workspace ── -->
    <div class="flex-1 flex min-h-0 overflow-hidden">
      <RouterView class="flex flex-1 min-h-0 overflow-hidden" />
    </div>

    <!-- ── Footer ── -->
    <footer class="flex-none h-6 flex items-center justify-center bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 text-[10px] text-gray-400 dark:text-gray-500 select-none">
      © 2026 Lenny76 &nbsp;·&nbsp; <a href="https://fatturahub.lenny76.com" target="_blank" rel="noopener" class="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">fatturahub.lenny76.com</a>
    </footer>

    <!-- ── Upload modal ── -->
    <UploadModal v-if="showUpload" @close="onUploadClose" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useInvoicesStore } from '@/stores/invoices';
import UploadModal from '@/components/UploadModal.vue';
import api from '@/api';

const store = useInvoicesStore();
const showUpload = ref(false);
const showSettings = ref(false);
const isDark = ref(false);

function toggleDark() {
  isDark.value = !isDark.value;
  document.documentElement.classList.toggle('dark', isDark.value);
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light');
}
const selectedYears = ref([]);
const selectedMonths = ref([]);
const selectedDocType = ref('');
const searchQ = ref('');

const months = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

function toggleYear(year) {
  if (year === null) {
    selectedYears.value = [];
  } else {
    const idx = selectedYears.value.indexOf(year);
    if (idx === -1) {
      selectedYears.value = [...selectedYears.value, year];
    } else {
      selectedYears.value = selectedYears.value.filter(y => y !== year);
    }
  }
  applyFilters();
}

function toggleMonth(month) {
  if (month === null) {
    selectedMonths.value = [];
  } else {
    const idx = selectedMonths.value.indexOf(month);
    if (idx === -1) {
      selectedMonths.value = [...selectedMonths.value, month];
    } else {
      selectedMonths.value = selectedMonths.value.filter(m => m !== month);
    }
  }
  applyFilters();
}

function applyFilters() {
  store.setFilter('years', selectedYears.value.join(','));
  store.setFilter('months', selectedMonths.value.join(','));
  store.fetchList();
}

onMounted(async () => {
  const saved = localStorage.getItem('theme');
  isDark.value = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', isDark.value);

  await store.fetchStats();
  await store.fetchList();
});

async function onUploadClose() {
  showUpload.value = false;
  await store.fetchStats();
  await store.fetchList();
}

function doSearch() {
  store.setFilter('q', searchQ.value);
  store.fetchList();
}

function clearSearch() {
  searchQ.value = '';
  store.setFilter('q', '');
  store.fetchList();
}

async function resetAllData() {
  showSettings.value = false;
  if (!confirm('Eliminare TUTTI i dati? Questa operazione è irreversibile.')) return;
  try {
    await api.delete('/admin/reset');
    store.resetFilters();
    selectedYears.value = [];
    selectedMonths.value = [];
    selectedDocType.value = '';
    searchQ.value = '';
    await store.fetchStats();
    await store.fetchList();
  } catch (e) {
    alert('Errore: ' + (e.response?.data?.error || e.message));
  }
}
</script>

<style>
.toolbar-btn {
  @apply flex items-center px-2 py-1 rounded text-xs text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer;
}
.toolbar-select {
  @apply bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-xs rounded px-2 py-1 outline-none focus:border-blue-500;
}
.filter-btn {
  @apply px-2 py-0.5 rounded text-xs transition-colors cursor-pointer whitespace-nowrap;
}
</style>
