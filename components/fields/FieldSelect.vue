<template>
  <USelectMenu
    v-model="model"
    :options="field.options ?? []"
    option-attribute="label"
    value-attribute="value"
    :placeholder="field.placeholder"
    :disabled="field.disabled"
    searchable
    :aria-label="field.label ?? field.name"
  />
</template>

<script setup lang="ts">
import type { FieldDef } from '~/shared/types'

defineProps<{ field: FieldDef }>()
const model = defineModel<any>()
</script>
