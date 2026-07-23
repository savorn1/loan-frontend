<template>
  <UInput
    v-model="model"
    type="datetime-local"
    :placeholder="field.placeholder"
    :disabled="field.disabled"
    :readonly="field.readonly"
    :required="field.required"
    :min="field.min !== undefined ? String(field.min) : undefined"
    :max="field.max !== undefined ? String(field.max) : undefined"
    :aria-label="field.label ?? field.name"
  />
</template>

<script setup lang="ts">
// Native datetime-local input — same dependency-free approach as DatePicker,
// but browsers already ship a time-aware picker for this input type so there's
// no calendar grid to build. Value is 'yyyy-MM-ddTHH:mm' (no seconds/timezone),
// which `new Date(...)` and formatDateTime() both accept as-is.
import type { FieldDef } from '~/shared/types'

defineProps<{ field: FieldDef }>()
const model = defineModel<any>()
</script>
