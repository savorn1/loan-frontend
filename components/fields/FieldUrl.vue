<template>
  <UInput
    v-model="model"
    type="url"
    :icon="field.icon ?? 'i-heroicons-link'"
    :placeholder="field.placeholder"
    :disabled="field.disabled"
    :readonly="field.readonly"
    :required="field.required"
    :aria-label="field.label ?? field.name"
  >
    <template v-if="field.prefix" #leading>
      <span class="text-gray-500 dark:text-gray-400 text-sm">{{ field.prefix }}</span>
    </template>
    <template v-if="field.suffix || isValidUrl" #trailing>
      <span class="flex items-center gap-1.5">
        <span v-if="field.suffix" class="text-gray-500 dark:text-gray-400 text-sm">{{
          field.suffix
        }}</span>
        <a
          v-if="isValidUrl"
          :href="model"
          target="_blank"
          rel="noopener noreferrer"
          class="text-gray-400 hover:text-primary-500 dark:hover:text-primary-400"
          :aria-label="`Open ${model} in a new tab`"
        >
          <UIcon name="i-heroicons-arrow-top-right-on-square" class="w-4 h-4" />
        </a>
      </span>
    </template>
  </UInput>
</template>

<script setup lang="ts">
// Backpack's url field, plus a quick "open in new tab" affordance once the
// value looks like a real absolute URL — lets you check the link works
// without copy-pasting it into a new tab yourself.
import type { FieldDef } from '~/shared/types'

defineProps<{ field: FieldDef }>()
const model = defineModel<any>()

const isValidUrl = computed(() => {
  if (!model.value) return false
  try {
    new URL(model.value)
    return true
  } catch {
    return false
  }
})
</script>
