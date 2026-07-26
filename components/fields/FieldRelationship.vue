<template>
  <USelectMenu
    v-model="model"
    :searchable="search"
    searchable-lazy
    option-attribute="label"
    value-attribute="value"
    :placeholder="field.placeholder ?? 'Search…'"
    :disabled="field.disabled"
    :aria-label="field.label ?? field.name"
  />
</template>

<script setup lang="ts">
// Async-searchable FK picker (Backpack's select2_from_ajax/relationship
// field) — field.search is handed straight to USelectMenu's own
// `searchable` function prop, which debounces it (200ms) and drives the
// dropdown itself; this component doesn't reimplement that.
import type { FieldDef } from '~/shared/types'

const props = defineProps<{ field: FieldDef }>()
const model = defineModel<any>()

// Keep the current value visible even when the latest search results don't
// include it (e.g. editing an existing record whose related item isn't
// among the first page of matches) — shown as a plain "#id" option rather
// than silently vanishing from the dropdown.
async function search(query: string) {
  const results = (await props.field.search?.(query)) ?? []
  if (model.value === undefined || model.value === null || model.value === '') return results
  if (results.some((option) => option.value === model.value)) return results
  return [{ label: `#${model.value}`, value: model.value }, ...results]
}
</script>
