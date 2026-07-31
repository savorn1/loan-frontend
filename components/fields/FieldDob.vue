<template>
  <UInput
    v-model="model"
    type="date"
    icon="i-heroicons-cake"
    :min="field.min !== undefined ? String(field.min) : undefined"
    :max="field.max !== undefined ? String(field.max) : undefined"
    :disabled="field.disabled"
    :readonly="field.readonly"
    :required="field.required"
    :aria-label="field.label ?? field.name"
  />
</template>

<script setup lang="ts">
// Plain native date input — the browser's own date picker, no custom popover
// component involved. Simpler and more reliable than a hand-rolled calendar.
import type { FieldDef } from '~/shared/types'

defineProps<{ field: FieldDef }>()
const model = defineModel<any>()
</script>
