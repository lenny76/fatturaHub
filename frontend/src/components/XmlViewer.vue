<template>
  <div>
    <div v-if="loading" class="text-gray-400 text-sm">Caricamento XML...</div>
    <pre v-else class="bg-gray-900 text-green-300 rounded p-4 overflow-auto text-xs leading-relaxed max-h-[600px]"><code>{{ formatted }}</code></pre>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import api from '@/api';

const props = defineProps({ invoiceId: [String, Number] });
const formatted = ref('');
const loading = ref(true);

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get(`/invoices/${props.invoiceId}/xml`, { responseType: 'text' });
    formatted.value = formatXml(data);
  } finally {
    loading.value = false;
  }
}

function formatXml(xml) {
  let formatted = '';
  let indent = 0;
  const lines = xml.replace(/>\s*</g, '>\n<').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('</')) indent = Math.max(0, indent - 1);
    formatted += '  '.repeat(indent) + trimmed + '\n';
    if (!trimmed.startsWith('</') && !trimmed.endsWith('/>') && !trimmed.startsWith('<?') && trimmed.includes('<') && !trimmed.includes('</')) indent++;
  }
  return formatted;
}

onMounted(load);
watch(() => props.invoiceId, load);
</script>
