<template>
  <DatePicker
    v-model="model"
    :placeholder="field.placeholder ?? 'Select a date'"
    :min="field.min !== undefined ? String(field.min) : undefined"
    :max="field.max !== undefined ? String(field.max) : undefined"
  />
</template>

<script setup lang="ts">
import type { FieldDef } from '~/shared/types'

defineProps<{ field: FieldDef }>()
const model = defineModel<any>()
</script>
