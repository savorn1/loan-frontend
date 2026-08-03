<template>
  <div>
    <PageHeader :title="t('loanCalculator.title')" :description="t('loanCalculator.description')" />

    <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <UCard class="lg:col-span-2">
        <template #header>
          <span class="font-semibold">{{ t('loanCalculator.inputsCardTitle') }}</span>
        </template>

        <UAlert
          v-if="fetchError"
          color="red"
          variant="subtle"
          class="mb-4"
          :title="apiErrorMessage(fetchError)"
        />

        <div class="mb-4">
          <label class="block text-sm font-medium mb-1">{{
            t('loanCalculator.productField.label')
          }}</label>
          <USelectMenu
            v-model="selectedProductId"
            :options="productOptions"
            option-attribute="label"
            value-attribute="value"
            :placeholder="t('loanCalculator.productField.placeholder')"
            searchable
          />
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {{ t('loanCalculator.productField.hint') }}
          </p>
        </div>

        <UAlert
          v-if="isFlatScheme"
          color="orange"
          variant="subtle"
          :title="t('loanCalculator.flatSchemeNote')"
          class="mb-4"
        />

        <DynamicForm
          v-model="calcForm"
          :fields="fields"
          :submit-label="t('loanCalculator.calculateButton')"
          @submit="onCalculate"
        />

        <p class="text-xs text-gray-500 dark:text-gray-400 mt-4">
          {{ t('loanCalculator.feesOutOfScopeNote') }}
        </p>
      </UCard>

      <div class="lg:col-span-3 space-y-6">
        <template v-if="result">
          <UAlert v-if="rangeWarning" color="orange" variant="subtle" :title="rangeWarning" />

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <UCard>
              <div class="text-sm text-gray-500 dark:text-gray-400">
                {{ t('loanCalculator.summary.installment') }}
              </div>
              <div class="text-2xl font-semibold">{{ formatCurrency(result.installment) }}</div>
            </UCard>
            <UCard>
              <div class="text-sm text-gray-500 dark:text-gray-400">
                {{ t('loanCalculator.summary.totalInterest') }}
              </div>
              <div class="text-2xl font-semibold">{{ formatCurrency(result.totalInterest) }}</div>
            </UCard>
            <UCard>
              <div class="text-sm text-gray-500 dark:text-gray-400">
                {{ t('loanCalculator.summary.totalPayment') }}
              </div>
              <div class="text-2xl font-semibold">{{ formatCurrency(result.totalPayment) }}</div>
            </UCard>
          </div>

          <UCard>
            <template #header>
              <span class="font-semibold">{{ t('loanCalculator.scheduleCardTitle') }}</span>
            </template>
            <DataTable :rows="result.schedule" :columns="scheduleColumns" />
          </UCard>
        </template>

        <UCard v-else>
          <EmptyState
            icon="i-heroicons-calculator"
            :title="t('loanCalculator.empty.title')"
            :description="t('loanCalculator.empty.description')"
          />
        </UCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { calculateSchedule, type AmortizationResult } from '~/features/loans/utils/amortization'
import type {
  LoanProductInterestSchemeResponse,
  LoanProductResponse
} from '~/features/loan-products/types'
import type {
  InterestSchemeDetailResponse,
  InterestSchemeResponse
} from '~/features/loan-configuration/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

const { t } = useI18n()
const api = useApi()

const { data: products, error: fetchError } = await useAsyncData('loan-calculator-products', () =>
  api<LoanProductResponse[]>('/loan-products')
)
const { data: productSchemes } = await useAsyncData('loan-calculator-product-schemes', () =>
  api<LoanProductInterestSchemeResponse[]>('/loan-products/interest-schemes')
)
const { data: schemes } = await useAsyncData('loan-calculator-schemes', () =>
  api<InterestSchemeResponse[]>('/interest-schemes')
)

const publishedProducts = computed(() =>
  (products.value ?? []).filter((p) => p.status === 'PUBLISHED')
)

const productOptions = computed(() =>
  publishedProducts.value.map((p) => ({ label: `${p.code} — ${p.name}`, value: p.id }))
)

const selectedProductId = ref<string | undefined>(undefined)
const selectedProduct = computed(() =>
  publishedProducts.value.find((p) => p.id === selectedProductId.value)
)
const isFlatScheme = ref(false)

// Picks the interest-scheme assignment that would actually apply today, per
// the tie-break rule documented in features/loan-products/types.ts: lowest
// `priority` among ACTIVE assignments whose effective window covers today,
// falling back to the assignment flagged `isDefault` if none currently do.
function resolveSchemeAssignment(loanProductId: string): LoanProductInterestSchemeResponse | null {
  const today = new Date().toISOString().slice(0, 10)
  const candidates = (productSchemes.value ?? []).filter(
    (a) => a.loanProductId === loanProductId && a.status === 'ACTIVE'
  )
  const withinWindow = candidates.filter(
    (a) => a.effectiveFrom <= today && (!a.effectiveTo || a.effectiveTo >= today)
  )
  const pool = withinWindow.length ? withinWindow : candidates.filter((a) => a.isDefault)
  if (!pool.length) return null
  return [...pool].sort((a, b) => a.priority - b.priority)[0]
}

watch(selectedProductId, async (productId) => {
  isFlatScheme.value = false
  const product = publishedProducts.value.find((p) => p.id === productId)
  if (!product || !productId) return

  calcForm.value.amount = product.minAmount
  calcForm.value.termMonths = product.minTerm

  const assignment = resolveSchemeAssignment(productId)
  if (!assignment) return

  const scheme = (schemes.value ?? []).find((s) => s.id === assignment.interestSchemeId)
  isFlatScheme.value = scheme?.interestType === 'FLAT'

  const details = await api<InterestSchemeDetailResponse[]>(
    `/interest-schemes/${assignment.interestSchemeId}/details`
  )
  const tier = details.find(
    (d) =>
      product.minAmount >= d.minAmount &&
      product.minAmount <= d.maxAmount &&
      product.minTerm >= d.minTerm &&
      product.minTerm <= d.maxTerm
  )
  if (tier) calcForm.value.annualRatePercent = tier.interestRate
})

const fields = computed<FieldDef[]>(() => [
  {
    name: 'amount',
    label: t('loanCalculator.fields.amount'),
    type: 'currency',
    required: true,
    wrapper: 'half',
    hint: selectedProduct.value
      ? t('loanCalculator.fields.amountRangeHint', {
          min: formatCurrency(selectedProduct.value.minAmount),
          max: formatCurrency(selectedProduct.value.maxAmount)
        })
      : undefined
  },
  {
    name: 'termMonths',
    label: t('loanCalculator.fields.termMonths'),
    type: 'number',
    required: true,
    wrapper: 'half',
    hint: selectedProduct.value
      ? t('loanCalculator.fields.termRangeHint', {
          min: selectedProduct.value.minTerm,
          max: selectedProduct.value.maxTerm
        })
      : undefined
  },
  {
    name: 'annualRatePercent',
    label: t('loanCalculator.fields.annualRate'),
    type: 'number',
    required: true,
    wrapper: 'half',
    suffix: '%',
    step: '0.01'
  },
  {
    name: 'startDate',
    label: t('loanCalculator.fields.startDate'),
    type: 'date',
    required: true,
    wrapper: 'half',
    default: new Date().toISOString().slice(0, 10)
  }
])

const scheduleColumns = computed<ColumnDef<AmortizationResult['schedule'][number]>[]>(() => [
  { key: 'installmentNumber', label: t('loanCalculator.scheduleColumns.number') },
  { key: 'dueDate', label: t('loanCalculator.scheduleColumns.dueDate'), type: 'date' },
  {
    key: 'principalComponent',
    label: t('loanCalculator.scheduleColumns.principal'),
    type: 'currency'
  },
  {
    key: 'interestComponent',
    label: t('loanCalculator.scheduleColumns.interest'),
    type: 'currency'
  },
  { key: 'amount', label: t('loanCalculator.scheduleColumns.amount'), type: 'currency' }
])

const calcForm = ref<Record<string, any>>({})
const result = ref<AmortizationResult | null>(null)

const rangeWarning = computed(() => {
  const product = selectedProduct.value
  if (!product || !result.value) return ''
  const amount = calcForm.value.amount
  const term = calcForm.value.termMonths
  if (
    amount < product.minAmount ||
    amount > product.maxAmount ||
    term < product.minTerm ||
    term > product.maxTerm
  ) {
    return t('loanCalculator.rangeWarning', {
      minAmount: formatCurrency(product.minAmount),
      maxAmount: formatCurrency(product.maxAmount),
      minTerm: product.minTerm,
      maxTerm: product.maxTerm
    })
  }
  return ''
})

function onCalculate(values: Record<string, any>) {
  result.value = calculateSchedule({
    principal: values.amount,
    annualRatePercent: values.annualRatePercent,
    termMonths: values.termMonths,
    startDate: new Date(values.startDate)
  })
}
</script>
