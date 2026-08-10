<template>
  <div>
    <UButton to="/reports" variant="link" icon="i-heroicons-arrow-left" size="xs" class="mb-1 px-0">
      {{ t('admin.reports.backToReports') }}
    </UButton>
    <PageHeader
      :title="t('accounting.repaymentReports.collection.title')"
      :description="t('accounting.repaymentReports.collection.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.repaymentReportsHeader') },
        { label: t('accounting.repaymentReports.collection.title') }
      ]"
    />

    <UCard class="mb-6">
      <UFormGroup
        :label="t('common.dateRangeFilter.from') + ' – ' + t('common.dateRangeFilter.to')"
        class="max-w-xs"
      >
        <DateRangeFilter v-model:from="dateFrom" v-model:to="dateTo" />
      </UFormGroup>
    </UCard>

    <UCard v-if="hasFullRange" class="mb-6">
      <dl class="grid grid-cols-3 gap-y-3 text-sm">
        <dt class="text-gray-500">
          {{ t('accounting.repaymentReports.collection.totalCollected') }}
        </dt>
        <dd class="font-semibold col-span-2 text-right">{{ formatCurrency(totalCollected) }}</dd>
        <dt class="text-gray-500">
          {{ t('accounting.repaymentReports.collection.totalPrincipal') }}
        </dt>
        <dd class="font-semibold col-span-2 text-right">{{ formatCurrency(totalPrincipal) }}</dd>
        <dt class="text-gray-500">
          {{ t('accounting.repaymentReports.collection.totalInterest') }}
        </dt>
        <dd class="font-semibold col-span-2 text-right">{{ formatCurrency(totalInterest) }}</dd>
      </dl>
    </UCard>

    <UCard>
      <template #header>
        <UInput
          v-model="search"
          icon="i-heroicons-magnifying-glass"
          size="sm"
          class="w-56"
          :placeholder="t('accounting.repaymentReports.collection.searchPlaceholder')"
        />
      </template>

      <UAlert
        v-if="fetchError"
        color="red"
        variant="subtle"
        class="mb-4"
        :title="apiErrorMessage(fetchError)"
      />

      <DataTable v-model:sort="sort" :rows="rows" :columns="columns" :loading="pending">
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-inbox-arrow-down"
            :title="
              hasFullRange
                ? t('accounting.repaymentReports.collection.emptyTitleNoActivity')
                : t('accounting.repaymentReports.collection.emptyTitlePick')
            "
            :description="
              hasFullRange
                ? t('accounting.repaymentReports.collection.emptyDescriptionNoActivity')
                : t('accounting.repaymentReports.collection.emptyDescriptionPick')
            "
          />
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { PaymentResponse } from '~/features/payments/types'
import type { PageResponse, ColumnDef } from '~/shared/types'

const { t } = useI18n()
const api = useApi()

const {
  data: paymentsRaw,
  pending,
  error: fetchError
} = await useAsyncData('repayments-collection', () =>
  api<PageResponse<PaymentResponse>>('/payments', { query: { size: 1000 } })
)
const payments = computed(() => paymentsRaw.value?.content ?? [])

const dateFrom = ref('')
const dateTo = ref('')
const hasFullRange = computed(() => !!dateFrom.value && !!dateTo.value)

const collected = computed<PaymentResponse[]>(() => {
  if (!hasFullRange.value) return []
  return payments.value.filter(
    (p) => p.status === 'PAID' && p.paidAt && p.paidAt >= dateFrom.value && p.paidAt <= dateTo.value
  )
})

const totalCollected = computed(() => collected.value.reduce((sum, p) => sum + p.amount, 0))
const totalPrincipal = computed(() =>
  collected.value.reduce((sum, p) => sum + (p.principalComponent ?? 0), 0)
)
const totalInterest = computed(() =>
  collected.value.reduce((sum, p) => sum + (p.interestComponent ?? 0), 0)
)

const { search, page, pageSize, sort, total, rows } = useClientTable(collected, {
  searchFields: ['loanId'],
  pageSize: 15
})

const columns = computed<ColumnDef<PaymentResponse>[]>(() => [
  {
    key: 'loanId',
    label: t('accounting.repaymentReports.collection.columns.loanId'),
    sortable: true
  },
  {
    key: 'installmentNumber',
    label: t('accounting.repaymentReports.collection.columns.installmentNumber'),
    sortable: true
  },
  {
    key: 'paidAt',
    label: t('accounting.repaymentReports.collection.columns.paidAt'),
    type: 'date',
    sortable: true
  },
  {
    key: 'amount',
    label: t('accounting.repaymentReports.collection.columns.amount'),
    type: 'currency',
    sortable: true
  },
  {
    key: 'principalComponent',
    label: t('accounting.repaymentReports.collection.columns.principalComponent'),
    type: 'currency'
  },
  {
    key: 'interestComponent',
    label: t('accounting.repaymentReports.collection.columns.interestComponent'),
    type: 'currency'
  }
])
</script>
