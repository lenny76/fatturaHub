<template>
  <div class="max-w-2xl">
    <h1 class="text-2xl font-bold mb-6">Carica Fatture</h1>

    <div class="bg-white rounded-lg shadow p-6">
      <!-- Drop zone -->
      <div
        class="border-2 border-dashed rounded-lg p-10 text-center transition-colors"
        :class="isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="onDrop"
        @click="fileInput.click()"
      >
        <div class="text-4xl mb-3">📂</div>
        <p class="text-gray-600 font-medium">Trascina i file qui oppure clicca per selezionare</p>
        <p class="text-xs text-gray-400 mt-1">File .xml e .xml.p7m — anche cartelle — max 20MB per file</p>
        <input ref="fileInput" type="file" multiple accept=".xml,.p7m" class="hidden" @change="onFileSelect" />
        <input ref="folderInput" type="file" webkitdirectory class="hidden" @change="onFileSelect" />
      </div>

      <!-- File list -->
      <div v-if="pendingFiles.length" class="mt-4 space-y-2">
        <div v-for="(f, i) in pendingFiles" :key="i"
          class="flex items-center justify-between bg-gray-50 rounded px-3 py-2 text-sm">
          <span class="truncate max-w-xs">{{ f.name }}</span>
          <div class="flex items-center gap-2 ml-2">
            <span class="text-gray-400 text-xs">{{ (f.size / 1024).toFixed(0) }} KB</span>
            <button @click="pendingFiles.splice(i,1)" class="text-red-400 hover:text-red-600">✕</button>
          </div>
        </div>
      </div>

      <!-- Upload button -->
      <button
        v-if="pendingFiles.length"
        @click="uploadFiles"
        :disabled="uploading"
        class="mt-4 w-full btn-primary py-2 disabled:opacity-50"
      >
        {{ uploading ? 'Caricamento...' : `Carica ${pendingFiles.length} file` }}
      </button>
    </div>

    <!-- Results -->
    <div v-if="results.length" class="mt-6 bg-white rounded-lg shadow p-4">
      <h2 class="font-semibold mb-3">Risultati importazione</h2>
      <ul class="space-y-2 text-sm">
        <li v-for="r in results" :key="r.filename" class="flex items-center gap-2">
          <span v-if="r.status === 'ok'" class="text-green-600">✓</span>
          <span v-else-if="r.status === 'duplicate'" class="text-yellow-500">⚠</span>
          <span v-else class="text-red-500">✗</span>
          <span class="truncate max-w-xs">{{ r.filename }}</span>
          <span v-if="r.status === 'ok'" class="text-green-600 text-xs">importata</span>
          <span v-else-if="r.status === 'duplicate'" class="text-yellow-600 text-xs">già presente</span>
          <span v-else class="text-red-500 text-xs">{{ r.error }}</span>
          <RouterLink v-if="r.id" :to="`/fatture/${r.id}`" class="text-blue-500 text-xs hover:underline ml-auto">Vedi</RouterLink>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import api from '@/api';

const isDragging = ref(false);
const pendingFiles = ref([]);
const uploading = ref(false);
const results = ref([]);
const fileInput = ref(null);

function onDrop(e) {
  isDragging.value = false;
  addFiles([...e.dataTransfer.files]);
}

function onFileSelect(e) {
  addFiles([...e.target.files]);
  e.target.value = '';
}

function addFiles(files) {
  for (const f of files) {
    const name = f.name.toLowerCase();
    if (name.endsWith('.xml') || name.endsWith('.p7m')) {
      if (!pendingFiles.value.find(p => p.name === f.name && p.size === f.size)) {
        pendingFiles.value.push(f);
      }
    }
  }
}

async function uploadFiles() {
  uploading.value = true;
  results.value = [];

  const formData = new FormData();
  formData.append('direction', 'passiva');
  for (const f of pendingFiles.value) formData.append('files', f);

  try {
    const { data } = await api.post('/upload', formData, { timeout: 0 });
    results.value = data.results;
    pendingFiles.value = [];
  } catch (e) {
    results.value = [{ filename: 'Errore', status: 'error', error: e.response?.data?.error || e.message }];
  } finally {
    uploading.value = false;
  }
}
</script>

<style scoped>
.btn-primary { @apply bg-blue-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-blue-700 transition-colors; }
</style>
