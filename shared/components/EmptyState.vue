<template>
  <div class="flex flex-col items-center justify-center text-center py-12 px-4">
    <div class="flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 mb-3">
      <UIcon :name="icon" class="w-6 h-6 text-gray-400 dark:text-gray-500" />
    </div>
    <p class="text-sm font-medium text-gray-900 dark:text-white">{{ title }}</p>
    <p v-if="description" class="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm">{{ description }}</p>
    <div v-if="$slots.action" class="mt-4">
      <slot name="action" />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  icon?: string
  title: string
  description?: string
}>(), {
  icon: 'i-heroicons-inbox'
})
</script>
