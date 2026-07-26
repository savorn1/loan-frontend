<template>
  <FileUpload
    v-model="model"
    :multiple="field.multiple"
    :accept="field.accept"
    :max-size-mb="field.maxSizeMb"
    :disabled="field.disabled"
  />
</template>

<script setup lang="ts">
import type { FieldDef } from '~/shared/types'

defineProps<{ field: FieldDef }>()
const model = defineModel<any>()
</script>
