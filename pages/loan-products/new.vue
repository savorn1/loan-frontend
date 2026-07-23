<template>
  <div>
    <UButton to="/loan-products" variant="link" icon="i-heroicons-arrow-left" size="xs" class="mb-1 px-0">
      Back to loan products
    </UButton>
    <h1 class="text-xl font-bold mb-6">New Loan Product</h1>

    <UCard class="max-w-2xl">
      <DynamicForm
        v-model="form"
        :fields="fields"
        :loading="creating"
        :error="error"
        submit-label="Create"
        cancelable
        @submit="onCreate"
        @cancel="router.push('/loan-products')"
      />
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { LoanProductRequest, LoanProductResponse } from '~/features/loan-products/types'
import type { FieldDef } from '~/shared/types'

const api = useApi()
const toast = useToast()
const router = useRouter()

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

const form = ref<Record<string, any>>({
  productName: '',
  productCode: '',
  currency: 'USD',
  status: 'ACTIVE',
  minAmount: undefined,
  maxAmount: undefined,
  defaultInterestRate: undefined,
  interestType: 'FLAT',
  repaymentMethod: 'EMI',
  paymentFrequency: 'MONTHLY',
  minTerm: undefined,
  maxTerm: undefined,
  termUnit: 'MONTH',
  gracePeriodDays: 0,
  autoGenerateSchedule: true,
  description: ''
})

const creating = ref(false)
const error = ref('')

async function onCreate(values: Record<string, any>) {
  creating.value = true
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
    const created = await api<LoanProductResponse>('/loan-products', { method: 'POST', body: payload })
    toast.add({ title: 'Loan product created', color: 'green' })
    await router.push(`/loan-products/${created.id}`)
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    creating.value = false
  }
}
</script>
