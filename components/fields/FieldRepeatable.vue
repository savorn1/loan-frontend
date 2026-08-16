<template>
  <div class="space-y-3">
    <div
      v-for="(row, i) in model"
      :key="i"
      class="rounded-lg border border-gray-200 dark:border-gray-700 p-3"
    >
      <div class="flex items-center justify-between mb-2.5">
        <span
          class="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500"
        >
          {{ rowLabel(i) }}
        </span>
        <UTooltip
          :text="canRemove ? t('common.remove') : t('common.minRowsReached', { min: minRows })"
        >
          <UButton
            size="2xs"
            color="red"
            variant="ghost"
            icon="i-heroicons-x-mark"
            :aria-label="t('common.remove')"
            :disabled="!canRemove"
            @click="removeRow(i)"
          />
        </UTooltip>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div
          v-for="sub in field.subfields"
          :key="sub.name"
          :class="(sub.wrapper ?? 'full') === 'full' ? 'sm:col-span-2' : 'sm:col-span-1'"
        >
          <Field v-model="row[sub.name]" :field="sub" />
        </div>
      </div>
    </div>

    <UButton
      size="2xs"
      variant="soft"
      icon="i-heroicons-plus"
      :disabled="maxReached"
      @click="addRow"
    >
      {{ field.addLabel || t('common.addRow') }}
    </UButton>
  </div>
</template>

<script setup lang="ts">
// Backpack's repeatable field: an add/remove-able list of rows, each row a
// mini-form of `field.subfields` rendered via <Field> — so every subfield
// gets the same label/hint/required treatment as a top-level field for free.
import type { FieldDef } from '~/shared/types'

const props = defineProps<{ field: FieldDef }>()
const model = defineModel<Record<string, unknown>[]>({ required: true })

const { t } = useI18n()

const minRows = computed(() => props.field.minRows ?? 0)
const canRemove = computed(() => model.value.length > minRows.value)
const maxReached = computed(
  () => props.field.maxRows !== undefined && model.value.length >= props.field.maxRows
)

function rowLabel(index: number) {
  return props.field.rowLabel ? props.field.rowLabel(index) : t('common.row', { n: index + 1 })
}

function addRow() {
  model.value.push(props.field.newRow ? props.field.newRow() : {})
}

function removeRow(index: number) {
  model.value.splice(index, 1)
}
</script>
