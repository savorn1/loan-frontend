<template>
  <UInput
    v-model="model"
    type="week"
    :disabled="field.disabled"
    :readonly="field.readonly"
    :required="field.required"
    :min="field.min !== undefined ? String(field.min) : undefined"
    :max="field.max !== undefined ? String(field.max) : undefined"
    :aria-label="field.label ?? field.name"
  />
</template>

<script setup lang="ts">
// Native week input — browsers ship their own ISO-week picker for this
// input type, so there's no custom widget to build (same reasoning as
// FieldDateTime). Value is 'yyyy-Www' (e.g. '2026-W30').
import type { FieldDef } from '~/shared/types'

defineProps<{ field: FieldDef }>()
const model = defineModel<any>()
</script>
