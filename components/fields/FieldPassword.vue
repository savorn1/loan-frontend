<template>
  <UInput
    v-model="model"
    :type="visible ? 'text' : 'password'"
    :icon="field.icon ?? 'i-heroicons-lock-closed'"
    :placeholder="field.placeholder"
    :disabled="field.disabled"
    :readonly="field.readonly"
    :required="field.required"
    :aria-label="field.label ?? field.name"
  >
    <template #trailing>
      <UButton
        color="gray"
        variant="link"
        :padded="false"
        :icon="visible ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
        :aria-label="visible ? 'Hide password' : 'Show password'"
        @click="visible = !visible"
      />
    </template>
  </UInput>
</template>

<script setup lang="ts">
import type { FieldDef } from '~/shared/types'

defineProps<{ field: FieldDef }>()
const model = defineModel<any>()

// Visibility toggle comes free with the dedicated component — one of the
// upsides of the per-type split.
const visible = ref(false)
</script>
