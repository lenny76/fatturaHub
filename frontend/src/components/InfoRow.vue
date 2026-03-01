<template>
  <div class="flex justify-between py-0.5">
    <span class="text-gray-500">{{ label }}</span>
    <span :class="bold ? 'font-semibold' : ''" class="text-right ml-2 max-w-[180px] truncate" :title="value">
      {{ value || '—' }}
    </span>
  </div>
</template>

<script setup>
defineProps({ label: String, value: [String, Number], bold: Boolean });
</script>
