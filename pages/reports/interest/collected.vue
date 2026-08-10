<template>
  <div>
    <UButton to="/reports" variant="link" icon="i-heroicons-arrow-left" size="xs" class="mb-1 px-0">
      {{ t('admin.reports.backToReports') }}
    </UButton>
    <PageHeader
      :title="t('accounting.interestReports.collected.title')"
      :description="t('accounting.interestReports.collected.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.interestReportsHeader') },
        { label: t('accounting.interestReports.collected.title') }
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

    <UCard v-if="total > 0" class="mb-6">
      <div class="flex justify-end text-sm font-semibold">
        <span
          >{{ t('accounting.interestReports.collected.totalCollected') }}:
          {{ formatCurrency(totalCollected) }}</span
        >
      </div>
    </UCard>

    <UCard>
      <template #header>
        <UInput
          v-model="search"
          icon="i-heroicons-magnifying-glass"
          size="sm"
          class="w-56"
          :placeholder="t('accounting.interestReports.collected.searchPlaceholder')"
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
                ? t('accounting.interestReports.collected.emptyTitleNoActivity')
                : t('accounting.interestReports.collected.emptyTitlePick')
            "
            :description="
              hasFullRange
                ? t('accounting.interestReports.collected.emptyDescriptionNoActivity')
                : t('accounting.interestReports.collected.emptyDescriptionPick')
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
} = await useAsyncData('interest-collected', () =>
  api<PageResponse<PaymentResponse>>('/payments', { query: { size: 1000 } })
)
const payments = computed(() => paymentsRaw.value?.content ?? [])

const dateFrom = ref('')
const dateTo = ref('')
const hasFullRange = computed(() => !!dateFrom.value && !!dateTo.value)

const collectedInRange = computed(() => {
  if (!hasFullRange.value) return []
  return payments.value.filter(
    (p): p is PaymentResponse & { paidAt: string } =>
      p.status === 'PAID' &&
      !!p.paidAt &&
      p.paidAt >= dateFrom.value &&
      p.paidAt <= dateTo.value &&
      !!p.interestComponent &&
      p.interestComponent > 0
  )
})

const totalCollected = computed(() =>
  collectedInRange.value.reduce((sum, p) => sum + (p.interestComponent ?? 0), 0)
)

const { search, page, pageSize, sort, total, rows } = useClientTable(collectedInRange, {
  searchFields: ['loanId'],
  pageSize: 15
})

const columns = computed<ColumnDef<PaymentResponse>[]>(() => [
  {
    key: 'loanId',
    label: t('accounting.interestReports.collected.columns.loanId'),
    sortable: true
  },
  {
    key: 'installmentNumber',
    label: t('accounting.interestReports.collected.columns.installmentNumber'),
    sortable: true
  },
  {
    key: 'paidAt',
    label: t('accounting.interestReports.collected.columns.paidAt'),
    type: 'date',
    sortable: true
  },
  {
    key: 'interestComponent',
    label: t('accounting.interestReports.collected.columns.interestComponent'),
    type: 'currency',
    sortable: true
  }
])
</script>
