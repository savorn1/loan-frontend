<template>
  <!-- hidden fields render nothing; their value just rides along in the model -->
  <UFormGroup
    v-if="field.type !== 'hidden'"
    :label="label"
    :name="field.name"
    :required="field.required"
    :help="field.hint"
  >
    <component :is="control" v-model="model" :field="field" />
  </UFormGroup>
</template>

<script setup lang="ts">
// Thin resolver, Backpack-style: each field type has its own component under
// shared/components/fields/ (like Backpack's one-blade-view-per-type). This
// file only owns what every type shares — the UFormGroup wrapper (label,
// required marker, hint) and the label auto-humanization.
import type { Component } from 'vue'
import type { FieldDef, FieldType } from '~/shared/types'
import FieldText from './fields/FieldText.vue'
import FieldEmail from './fields/FieldEmail.vue'
import FieldPassword from './fields/FieldPassword.vue'
import FieldUrl from './fields/FieldUrl.vue'
import FieldNumber from './fields/FieldNumber.vue'
import FieldTextarea from './fields/FieldTextarea.vue'
import FieldSelect from './fields/FieldSelect.vue'
import FieldRadio from './fields/FieldRadio.vue'
import FieldCheckbox from './fields/FieldCheckbox.vue'
import FieldSwitch from './fields/FieldSwitch.vue'
import FieldRange from './fields/FieldRange.vue'
import FieldDate from './fields/FieldDate.vue'

const props = defineProps<{ field: FieldDef }>()

const model = defineModel<any>()

const CONTROLS: Record<Exclude<FieldType, 'hidden'>, Component> = {
  text: FieldText,
  email: FieldEmail,
  password: FieldPassword,
  url: FieldUrl,
  number: FieldNumber,
  textarea: FieldTextarea,
  select: FieldSelect,
  radio: FieldRadio,
  checkbox: FieldCheckbox,
  switch: FieldSwitch,
  range: FieldRange,
  date: FieldDate
}

const control = computed(() => CONTROLS[(props.field.type ?? 'text') as Exclude<FieldType, 'hidden'>])

// Backpack behavior: label is optional and constructed from the name —
// 'dateOfBirth' / 'date_of_birth' both become 'Date of birth'.
const label = computed(() => props.field.label ?? humanize(props.field.name))

function humanize(name: string): string {
  const words = name
    .replace(/_/g, ' ')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}
</script>
