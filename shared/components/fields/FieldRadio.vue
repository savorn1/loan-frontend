<template>
  <URadioGroup
    v-model="model"
    :options="field.options ?? []"
    :disabled="field.disabled"
  />
</template>

<script setup lang="ts">
import type { FieldDef } from '~/shared/types'

defineProps<{ field: FieldDef }>()
const model = defineModel<any>()
</script>
