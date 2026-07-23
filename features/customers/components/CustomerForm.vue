<template>
  <DynamicForm
    v-model="form"
    :fields="fields"
    :loading="loading"
    :submit-label="submitLabel ?? 'Save'"
    :cancelable="cancelable"
    @submit="onSubmit"
    @cancel="emit('cancel')"
  />
</template>

<script setup lang="ts">
// Declarative rewrite on top of the Backpack-style <DynamicForm>/<Field>
// components (shared/components) — same rendered output as the previous
// hand-written template (2-col name row, icons, DatePicker capped at today),
// but the field list is now data instead of markup.
import type { CustomerRequest } from '~/features/customers/types'
import type { FieldDef } from '~/shared/types'

const props = defineProps<{
  initial?: Partial<CustomerRequest>
  loading?: boolean
  submitLabel?: string
  cancelable?: boolean
}>()

const emit = defineEmits<{ submit: [CustomerRequest]; cancel: [] }>()

const now = new Date()
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

// Labels are omitted where Backpack-style auto-humanization of the name
// produces the right text ('firstName' → 'First name').
const fields: FieldDef[] = [
  { name: 'firstName', required: true, wrapper: 'half' },
  { name: 'lastName', required: true, wrapper: 'half' },
  { name: 'email', type: 'email', required: true, icon: 'i-heroicons-envelope' },
  { name: 'phone', icon: 'i-heroicons-phone', wrapper: 'half' },
  { name: 'nationalId', label: 'National ID', icon: 'i-heroicons-identification', wrapper: 'half' },
  { name: 'address', icon: 'i-heroicons-map-pin' },
  {
    name: 'dateOfBirth',
    type: 'date',
    placeholder: 'Select date of birth',
    max: today,
    hint: 'Optional'
  }
]

const form = ref<Record<string, any>>({
  firstName: props.initial?.firstName ?? '',
  lastName: props.initial?.lastName ?? '',
  email: props.initial?.email ?? '',
  phone: props.initial?.phone ?? '',
  nationalId: props.initial?.nationalId ?? '',
  address: props.initial?.address ?? '',
  dateOfBirth: props.initial?.dateOfBirth ?? ''
})

function onSubmit(values: Record<string, any>) {
  emit('submit', values as CustomerRequest)
}
</script>
