<template>
  <UCard class="max-w-2xl">
    <template #header>
      <span class="font-semibold">Configuration</span>
    </template>
    <DynamicForm
      v-if="form"
      v-model="form"
      :fields="fields"
      :loading="saving"
      :error="error"
      submit-label="Save changes"
      @submit="onUpdate"
    />
  </UCard>
</template>

<script setup lang="ts">
import type { LoanProductRequest, LoanProductResponse } from '~/features/loan-products/types'
import type { FieldDef } from '~/shared/types'

const route = useRoute()
const api = useApi()
const toast = useToast()

const productId = route.params.id as string

const { data: product, refresh } = await useAsyncData(`loan-product-${productId}`, () =>
  api<LoanProductResponse>(`/loan-products/${productId}`)
)

const fields: FieldDef[] = [
  { name: 'productName', label: 'Product name', required: true, wrapper: 'half' },
  { name: 'productCode', label: 'Product code', required: true, hint: 'e.g. PL, HL', wrapper: 'half' },
  {
    name: 'currency',
    type: 'select',
    required: true,
    wrapper: 'half',
    options: [
      { label: 'USD', value: 'USD' },
      { label: 'KHR', value: 'KHR' }
    ]
  },
  {
    name: 'status',
    type: 'select',
    required: true,
    wrapper: 'half',
    options: [
      { label: 'Active', value: 'ACTIVE' },
      { label: 'Inactive', value: 'INACTIVE' }
    ]
  },
  { name: 'minAmount', label: 'Min amount', type: 'number', required: true, min: 0, step: 0.01, wrapper: 'half' },
  { name: 'maxAmount', label: 'Max amount', type: 'number', required: true, min: 0, step: 0.01, wrapper: 'half' },
  { name: 'defaultInterestRate', label: 'Default interest rate', type: 'number', required: true, suffix: '%', min: 0.01, max: 100, step: 0.01, wrapper: 'half' },
  {
    name: 'interestType',
    label: 'Interest type',
    type: 'select',
    required: true,
    wrapper: 'half',
    options: [
      { label: 'Flat', value: 'FLAT' },
      { label: 'Reducing', value: 'REDUCING' }
    ]
  },
  {
    name: 'repaymentMethod',
    label: 'Repayment method',
    type: 'select',
    required: true,
    wrapper: 'half',
    options: [
      { label: 'EMI', value: 'EMI' },
      { label: 'Equal principal', value: 'EQUAL_PRINCIPAL' },
      { label: 'Bullet', value: 'BULLET' }
    ]
  },
  {
    name: 'paymentFrequency',
    label: 'Payment frequency',
    type: 'select',
    required: true,
    wrapper: 'half',
    options: [
      { label: 'Daily', value: 'DAILY' },
      { label: 'Weekly', value: 'WEEKLY' },
      { label: 'Monthly', value: 'MONTHLY' }
    ]
  },
  { name: 'minTerm', label: 'Min term', type: 'number', required: true, min: 1, wrapper: 'half' },
  { name: 'maxTerm', label: 'Max term', type: 'number', required: true, min: 1, wrapper: 'half' },
  {
    name: 'termUnit',
    label: 'Term unit',
    type: 'select',
    required: true,
    wrapper: 'half',
    options: [
      { label: 'Day', value: 'DAY' },
      { label: 'Month', value: 'MONTH' },
      { label: 'Year', value: 'YEAR' }
    ]
  },
  { name: 'gracePeriodDays', label: 'Grace period (days)', type: 'number', min: 0, wrapper: 'half' },
  { name: 'autoGenerateSchedule', label: 'Auto-generate repayment schedule', type: 'switch' },
  { name: 'description', type: 'textarea' }
]

const form = ref<Record<string, any> | null>(product.value
  ? {
      productName: product.value.productName,
      productCode: product.value.productCode,
      currency: product.value.currency,
      status: product.value.status,
      minAmount: product.value.minAmount,
      maxAmount: product.value.maxAmount,
      defaultInterestRate: product.value.defaultInterestRate,
      interestType: product.value.interestType,
      repaymentMethod: product.value.repaymentMethod,
      paymentFrequency: product.value.paymentFrequency,
      minTerm: product.value.minTerm,
      maxTerm: product.value.maxTerm,
      termUnit: product.value.termUnit,
      gracePeriodDays: product.value.gracePeriodDays,
      autoGenerateSchedule: product.value.autoGenerateSchedule,
      description: product.value.description ?? ''
    }
  : null)

const saving = ref(false)
const error = ref('')

async function onUpdate(values: Record<string, any>) {
  saving.value = true
  error.value = ''
  try {
    const payload: LoanProductRequest = {
      productName: values.productName,
      productCode: values.productCode,
      currency: values.currency,
      status: values.status,
      minAmount: values.minAmount,
      maxAmount: values.maxAmount,
      defaultInterestRate: values.defaultInterestRate,
      interestType: values.interestType,
      repaymentMethod: values.repaymentMethod,
      paymentFrequency: values.paymentFrequency,
      minTerm: values.minTerm,
      maxTerm: values.maxTerm,
      termUnit: values.termUnit,
      gracePeriodDays: values.gracePeriodDays ?? 0,
      autoGenerateSchedule: values.autoGenerateSchedule,
      description: values.description || undefined
    }
    await api(`/loan-products/${productId}`, { method: 'PUT', body: payload })
    toast.add({ title: 'Loan product updated', color: 'green' })
    await refresh()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    saving.value = false
  }
}
</script>
