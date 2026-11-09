<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="$emit('close')">
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">

      <!-- Header -->
      <div class="flex items-center justify-between px-5 py-3 bg-gray-800 text-white">
        <span class="font-semibold text-sm">📂 Carica Fatture</span>
        <button @click="$emit('close')" class="text-gray-400 hover:text-white text-lg leading-none">✕</button>
      </div>

      <div class="p-5">

        <!-- Drop zone -->
        <div
          class="border-2 border-dashed rounded-lg py-8 text-center transition-colors"
          :class="isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="onDrop"
        >
          <div class="text-3xl mb-2">📄</div>
          <p class="text-sm text-gray-600 dark:text-gray-300">Trascina file o <strong>cartelle</strong> con <strong>.xml</strong> / <strong>.xml.p7m</strong></p>
          <div class="flex items-center justify-center gap-2 mt-3">
            <button type="button" @click="fileInput.click()" class="px-3 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 cursor-pointer">📄 Seleziona file</button>
            <button type="button" @click="folderInput.click()" class="px-3 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 cursor-pointer">📁 Seleziona cartella</button>
          </div>
          <input ref="fileInput" type="file" multiple accept=".xml,.p7m" class="hidden" @change="onFileSelect" />
          <input ref="folderInput" type="file" webkitdirectory multiple class="hidden" @change="onFileSelect" />
        </div>

        <!-- File list -->
        <div v-if="pendingFiles.length" class="mt-3 max-h-32 overflow-y-auto space-y-1">
          <div v-for="(f, i) in pendingFiles" :key="i"
            class="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded px-3 py-1.5 text-xs dark:text-gray-200">
            <span class="truncate max-w-[320px]">{{ f.name }}</span>
            <div class="flex items-center gap-2 flex-none ml-2">
              <span class="text-gray-400">{{ (f.size / 1024).toFixed(0) }} KB</span>
              <button @click="pendingFiles.splice(i,1)" class="text-red-400 hover:text-red-600">✕</button>
            </div>
          </div>
        </div>

        <!-- Upload button -->
        <button
          v-if="pendingFiles.length && !uploading"
          @click="uploadFiles"
          class="mt-4 w-full py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
        >
          Carica {{ pendingFiles.length }} file
        </button>

        <!-- Progress bar -->
        <div v-if="uploading" class="mt-4">
          <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span v-if="rateLimitWait" class="text-amber-600 dark:text-amber-400">Limite upload raggiunto, riprendo tra {{ rateLimitWait }}s...</span>
            <span v-else>Importazione in corso...</span>
            <span>{{ progressDone }} / {{ progressTotal }}</span>
          </div>
          <div class="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 overflow-hidden">
            <div
              class="bg-blue-600 h-2 rounded-full transition-all duration-300"
              :style="{ width: progress + '%' }"
            />
          </div>
        </div>

        <!-- Results summary -->
        <div v-if="summary.total" class="mt-4 space-y-2">
          <!-- Counts row -->
          <div class="flex flex-wrap gap-3 text-xs px-2 py-2 rounded bg-gray-50 dark:bg-gray-700">
            <span v-if="summary.ok" class="text-green-600 font-medium">✓ {{ summary.ok }} {{ summary.ok === 1 ? 'fattura importata' : 'fatture importate' }}</span>
            <span v-if="summary.duplicate" class="text-yellow-600 font-medium">⚠ {{ summary.duplicate }} già presenti</span>
            <span v-if="summary.failed" class="text-red-500 font-medium">✗ {{ summary.failed }} non importate</span>
            <span v-if="summary.skipped" class="text-gray-500 font-medium" title="Ricevute e notifiche SDI (RC, NS, MT…): non sono fatture">⊘ {{ summary.skipped }} notifiche SDI ignorate</span>
          </div>

          <!-- Files not imported: unreadable invoices and import errors -->
          <div v-if="failedFiles.length" class="max-h-48 overflow-y-auto space-y-1">
            <div class="text-xs font-medium text-red-600 px-2">File non importati — verifica che non siano fatture mancanti:</div>
            <div v-for="r in failedFiles" :key="r.filename" class="flex items-start gap-2 text-xs px-2 py-1 rounded bg-red-50 dark:bg-red-900/20">
              <span class="text-red-500 flex-none">✗</span>
              <span class="truncate max-w-[280px] flex-none dark:text-gray-200">{{ r.filename }}</span>
              <span class="text-red-500 break-all">{{ r.error }}</span>
            </div>
          </div>
        </div>

        <!-- Close after upload -->
        <button v-if="summary.total" @click="$emit('close')" class="mt-3 w-full py-2 bg-gray-700 text-white rounded text-sm hover:bg-gray-800">
          Chiudi
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import api from '@/api';

defineEmits(['close']);

const CHUNK_SIZE = 50;

const isDragging = ref(false);
const pendingFiles = ref([]);
const uploading = ref(false);
const emptySummary = () => ({ total: 0, ok: 0, duplicate: 0, skipped: 0, failed: 0 });
const summary = ref(emptySummary());
const failedFiles = ref([]);
const fileInput = ref(null);
const folderInput = ref(null);
const progress = ref(0);
const progressDone = ref(0);
const progressTotal = ref(0);
const rateLimitWait = ref(0); // secondi di attesa dopo un 429 sull'upload

async function onDrop(e) {
  isDragging.value = false;
  // DataTransfer items are only readable synchronously inside the drop event:
  // after the first await they are emptied, so grab every entry up front.
  const entries = [...e.dataTransfer.items]
    .map(item => item.webkitGetAsEntry?.())
    .filter(Boolean);
  const files = [];
  for (const entry of entries) await collectEntries(entry, files);
  addFiles(files);
}

async function collectEntries(entry, files) {
  if (entry.isFile) {
    const file = await new Promise(resolve => entry.file(resolve, () => resolve(null)));
    if (file) files.push(file);
  } else if (entry.isDirectory) {
    const reader = entry.createReader();
    // readEntries may return at most 100 items per call — loop until empty
    let batch;
    do {
      batch = await new Promise(resolve => reader.readEntries(resolve, () => resolve([])));
      for (const child of batch) await collectEntries(child, files);
    } while (batch.length > 0);
  }
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

// Un file può contenere un lotto di più fatture (r.count)
function tally(r) {
  summary.value.total++;
  if (r.status === 'ok') summary.value.ok += r.count || 1;
  else if (r.status === 'duplicate') summary.value.duplicate++;
  else if (r.status === 'skipped') summary.value.skipped++;
  else { summary.value.failed++; failedFiles.value.push(r); }
}

const MAX_RATE_LIMIT_RETRIES = 20;

// POST /upload che, se il server risponde 429 (limite upload/minuto superato,
// es. migliaia di file duplicati elaborati in pochi secondi), attende il tempo
// indicato da Retry-After e ripete la stessa richiesta invece di fallire.
async function postUpload(formData) {
  for (let attempt = 0; ; attempt++) {
    try {
      const { data } = await api.post('/upload', formData, { timeout: 0 });
      return data;
    } catch (e) {
      if (e.response?.status !== 429 || attempt >= MAX_RATE_LIMIT_RETRIES) throw e;
      const retryAfter = Number(e.response.headers?.['retry-after']);
      let wait = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.ceil(retryAfter) : 30;
      while (wait > 0) {
        rateLimitWait.value = wait;
        await new Promise(r => setTimeout(r, 1000));
        wait--;
      }
      rateLimitWait.value = 0;
    }
  }
}

async function uploadFiles() {
  uploading.value = true;
  summary.value = emptySummary();
  failedFiles.value = [];
  progress.value = 0;

  const files = pendingFiles.value;
  progressTotal.value = files.length;
  progressDone.value = 0;

  const chunks = [];
  for (let i = 0; i < files.length; i += CHUNK_SIZE) chunks.push(files.slice(i, i + CHUNK_SIZE));

  for (const chunk of chunks) {
    try {
      const formData = new FormData();
      formData.append('direction', 'passiva');
      for (const f of chunk) formData.append('files', f);
      const data = await postUpload(formData);
      data.results.forEach(tally);
    } catch (e) {
      // Chunk failed (likely backend crash) — retry file-by-file to isolate the problem
      for (const f of chunk) {
        try {
          const single = new FormData();
          single.append('direction', 'passiva');
          single.append('files', f);
          const data = await postUpload(single);
          data.results.forEach(tally);
        } catch (e2) {
          tally({ filename: f.name, status: 'error', error: e2.response?.data?.error || e2.message });
        }
      }
    }
    progressDone.value += chunk.length;
    progress.value = Math.round((progressDone.value / progressTotal.value) * 100);
  }

  pendingFiles.value = [];
  uploading.value = false;
}
</script>
