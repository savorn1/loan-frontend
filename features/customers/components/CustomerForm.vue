<template>
  <DynamicForm
    v-model="form"
    :fields="fields"
    :loading="loading"
    :submit-label="submitLabel ?? t('common.save')"
    :cancelable="cancelable"
    @submit="onSubmit"
    @cancel="emit('cancel')"
  />
</template>

<script setup lang="ts">
import type { CustomerRequest, CustomerResponse } from '~/features/customers/types'
import type { BranchResponse } from '~/features/branches/types'
import type { FieldDef } from '~/shared/types'

const props = defineProps<{
  initial?: Partial<CustomerResponse>
  loading?: boolean
  submitLabel?: string
  cancelable?: boolean
}>()

const emit = defineEmits<{ submit: [CustomerRequest]; cancel: [] }>()

const { t } = useI18n()
const api = useApi()

const { data: branchesData } = await useAsyncData('branches-all', () =>
  api<BranchResponse[]>('/branches')
)
const branchOptions = computed(() => [
  { label: t('customers.form.branchNone'), value: '' },
  ...(branchesData.value ?? []).map((b) => ({ label: b.name, value: b.id }))
])

const now = new Date()
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

const fields = computed<FieldDef[]>(() => [
  { name: 'firstName', label: t('customers.form.firstName'), required: true, wrapper: 'half' },
  { name: 'lastName', label: t('customers.form.lastName'), required: true, wrapper: 'half' },
  {
    name: 'email',
    label: t('customers.form.email'),
    type: 'email',
    required: true,
    icon: 'i-heroicons-envelope'
  },
  { name: 'phone', label: t('customers.form.phone'), type: 'phone', wrapper: 'half' },
  {
    name: 'nationalId',
    label: t('customers.form.nationalId'),
    icon: 'i-heroicons-identification',
    wrapper: 'half'
  },
  { name: 'address', label: t('customers.form.address'), icon: 'i-heroicons-map-pin' },
  {
    name: 'dateOfBirth',
    label: t('customers.form.dateOfBirth'),
    type: 'dob',
    max: today,
    hint: t('customers.form.dateOfBirthHint')
  },
  {
    name: 'branchId',
    label: t('customers.form.branch'),
    type: 'select',
    wrapper: 'half',
    options: branchOptions.value
  }
])

const form = ref<Record<string, any>>({
  customerType: props.initial?.customerType ?? 'INDIVIDUAL',
  firstName: props.initial?.firstName ?? '',
  lastName: props.initial?.lastName ?? '',
  email: props.initial?.email ?? '',
  phone: props.initial?.phone ?? '',
  nationalId: props.initial?.nationalId ?? '',
  address: props.initial?.address ?? '',
  dateOfBirth: props.initial?.dateOfBirth ?? '',
  branchId: props.initial?.branchId ?? ''
})

function onSubmit(values: Record<string, any>) {
  emit('submit', { ...values, branchId: values.branchId || undefined } as CustomerRequest)
}
</script>
