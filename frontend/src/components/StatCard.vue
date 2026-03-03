<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
    <div class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{{ label }}</div>
    <div class="text-2xl font-bold" :class="colorClass">{{ value ?? '—' }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
const props = defineProps({ label: String, value: [String, Number], color: { type: String, default: 'gray' } });
const colorClass = computed(() => ({ blue: 'text-blue-600', green: 'text-green-600', gray: 'text-gray-800 dark:text-gray-100' }[props.color]));
</script>
