<template>
  <div class="flex items-center gap-3">
    <URange
      v-model="model"
      :min="Number(field.min ?? 0)"
      :max="Number(field.max ?? 100)"
      :step="Number(field.step ?? 1)"
      :disabled="field.disabled"
      class="flex-1"
      :aria-label="field.label ?? field.name"
    />
    <span class="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-10 text-right">{{ model }}</span>
  </div>
</template>

<script setup lang="ts">
import type { FieldDef } from '~/shared/types'

defineProps<{ field: FieldDef }>()
const model = defineModel<any>()
</script>
