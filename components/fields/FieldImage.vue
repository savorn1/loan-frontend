<template>
  <FileUpload
    v-model="model"
    :multiple="field.multiple"
    :accept="field.accept ?? 'image/*'"
    :max-size-mb="field.maxSizeMb"
    :disabled="field.disabled"
    icon="i-heroicons-photo"
  />
</template>

<script setup lang="ts">
import type { FieldDef } from '~/shared/types'

defineProps<{ field: FieldDef }>()
const model = defineModel<any>()
</script>
