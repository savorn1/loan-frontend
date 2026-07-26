<template>
  <PhoneInput
    v-model="model"
    :disabled="field.disabled"
    :placeholder="field.placeholder"
    :default-country="field.defaultCountry"
  />
</template>

<script setup lang="ts">
import type { FieldDef } from '~/shared/types'

defineProps<{ field: FieldDef }>()
const model = defineModel<any>()
</script>
