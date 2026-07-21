<template>
  <UInput
    v-model="model"
    type="email"
    :icon="field.icon ?? 'i-heroicons-envelope'"
    :placeholder="field.placeholder"
    :disabled="field.disabled"
    :readonly="field.readonly"
    :required="field.required"
    :aria-label="field.label ?? field.name"
  >
    <template v-if="field.prefix" #leading>
      <span class="text-gray-500 dark:text-gray-400 text-sm">{{ field.prefix }}</span>
    </template>
    <template v-if="field.suffix" #trailing>
      <span class="text-gray-500 dark:text-gray-400 text-sm">{{ field.suffix }}</span>
    </template>
  </UInput>
</template>

<script setup lang="ts">
import type { FieldDef } from '~/shared/types'

defineProps<{ field: FieldDef }>()
const model = defineModel<any>()
</script>
