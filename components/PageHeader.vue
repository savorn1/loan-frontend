<template>
  <div>
    <UBreadcrumb v-if="crumbs?.length" :links="crumbs" class="mb-2" />
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div class="min-w-0">
        <h1 class="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{{ title }}</h1>
        <p v-if="description" class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {{ description }}
        </p>
      </div>
      <div v-if="$slots.actions" class="flex items-center gap-2 shrink-0">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BreadcrumbLink } from '#ui/types'

defineProps<{
  title: string
  description?: string
  crumbs?: BreadcrumbLink[]
}>()
</script>
