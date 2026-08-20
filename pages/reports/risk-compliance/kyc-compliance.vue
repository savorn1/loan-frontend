<template>
  <div>
    <BackToReportsButton />
    <PageHeader
      :title="t('accounting.riskComplianceReports.kycCompliance.title')"
      :description="t('accounting.riskComplianceReports.kycCompliance.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.riskComplianceReportsHeader') },
        { label: t('accounting.riskComplianceReports.kycCompliance.title') }
      ]"
    />

    <UCard class="mb-6">
      <dl class="grid grid-cols-1 sm:grid-cols-3 gap-y-3 text-sm">
        <dt class="text-gray-500">
          {{ t('accounting.riskComplianceReports.kycCompliance.expiredCount') }}
        </dt>
        <dd class="font-semibold text-red-500">{{ expiredCount }}</dd>
        <dt class="text-gray-500">
          {{ t('accounting.riskComplianceReports.kycCompliance.expiringCount') }}
        </dt>
        <dd class="font-semibold text-amber-500">{{ expiringCount }}</dd>
        <dt class="text-gray-500">
          {{ t('accounting.riskComplianceReports.kycCompliance.missingKycCount') }}
        </dt>
        <dd class="font-semibold text-red-500">{{ missingKycCount }}</dd>
      </dl>
    </UCard>

    <UCard class="mb-6">
      <UFormGroup class="max-w-xs">
        <USelectMenu
          v-model="range"
          :options="rangeOptions"
          option-attribute="label"
          value-attribute="value"
        />
      </UFormGroup>
    </UCard>

    <UCard>
      <template #header>
        <UInput
          v-model="search"
          icon="i-heroicons-magnifying-glass"
          size="sm"
          class="w-full sm:w-64"
          :placeholder="t('accounting.riskComplianceReports.kycCompliance.searchPlaceholder')"
        />
      </template>

      <UAlert
        v-if="fetchError"
        color="red"
        variant="subtle"
        class="mb-4"
        :title="apiErrorMessage(fetchError)"
      />

      <DataTable v-model:sort="sort" :rows="pagedRows" :columns="columns" :loading="pending">
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-identification"
            :title="t('accounting.riskComplianceReports.kycCompliance.emptyTitle')"
            :description="t('accounting.riskComplianceReports.kycCompliance.emptyDescription')"
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
import type { CustomerResponse, CustomerIdentityResponse } from '~/features/customers/types'
import type { PageResponse, ColumnDef } from '~/shared/types'

type KycRange = '30' | '60' | '90'

interface KycRow {
  customer: string
  identityType: string
  identityNumber: string
  expiryDate: string
  status: string
  daysUntilExpiry: number
}

const { t } = useI18n()
const api = useApi()

const {
  data: customersRaw,
  pending: p1,
  error: e1
} = await useAsyncData('kyc-compliance-customers', () =>
  api<PageResponse<CustomerResponse>>('/customers', { query: { size: 1000 } })
)
const customers = computed(() => customersRaw.value?.content ?? [])

// No portfolio-wide identity endpoint exists — only per-customer
// (/customers/{id}/identities) — so fetch one call per customer. The heaviest
// fan-out in this report set, but KYC coverage genuinely needs to span the
// whole customer book, not just those with an active loan.
const {
  data: identitiesByCustomer,
  pending: p2,
  error: e2
} = await useAsyncData(
  'kyc-compliance-identities',
  () =>
    Promise.all(
      customers.value.map((c) => api<CustomerIdentityResponse[]>(`/customers/${c.id}/identities`))
    ),
  { watch: [customers] }
)

const pending = computed(() => p1.value || p2.value)
const fetchError = computed(() => e1.value || e2.value)

function toIsoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const todayIso = toIsoDate(new Date())

function daysBetween(from: string, to: string) {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000)
}

const range = ref<KycRange>('30')
const rangeOptions = computed(() => [
  { label: t('accounting.riskComplianceReports.kycCompliance.range30'), value: '30' },
  { label: t('accounting.riskComplianceReports.kycCompliance.range60'), value: '60' },
  { label: t('accounting.riskComplianceReports.kycCompliance.range90'), value: '90' }
])
const windowEnd = computed(() => {
  const d = new Date()
  d.setDate(d.getDate() + Number(range.value))
  return toIsoDate(d)
})

// Every identity that's already expired, or set to expire within the
// selected window — regardless of its stored `status`, since that field can
// lag behind the actual expiry date.
const rows = computed<KycRow[]>(() => {
  const result: KycRow[] = []
  customers.value.forEach((customer, i) => {
    for (const identity of identitiesByCustomer.value?.[i] ?? []) {
      if (identity.status === 'REVOKED' || !identity.expiryDate) continue
      const isExpired = identity.expiryDate < todayIso
      const isExpiringSoon =
        identity.expiryDate >= todayIso && identity.expiryDate <= windowEnd.value
      if (!isExpired && !isExpiringSoon) continue
      result.push({
        customer: customer.fullName,
        identityType: identity.identityType,
        identityNumber: identity.identityNumber,
        expiryDate: identity.expiryDate,
        status: isExpired ? 'EXPIRED' : identity.status,
        daysUntilExpiry: daysBetween(todayIso, identity.expiryDate)
      })
    }
  })
  return result.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
})

const expiredCount = computed(() => rows.value.filter((r) => r.daysUntilExpiry < 0).length)
const expiringCount = computed(() => rows.value.filter((r) => r.daysUntilExpiry >= 0).length)

// Customers with zero identity documents on file at all — not filtered by
// the date window above, since a missing document isn't a date to compare.
const missingKycCount = computed(
  () => (identitiesByCustomer.value ?? []).filter((identities) => identities.length === 0).length
)

const {
  search,
  page,
  pageSize,
  sort,
  total,
  rows: pagedRows
} = useClientTable(rows, {
  searchFields: ['customer', 'identityNumber'],
  pageSize: 15
})

const columns = computed<ColumnDef<KycRow>[]>(() => [
  {
    key: 'customer',
    label: t('accounting.riskComplianceReports.kycCompliance.columns.customer'),
    sortable: true
  },
  {
    key: 'identityType',
    label: t('accounting.riskComplianceReports.kycCompliance.columns.identityType'),
    type: 'enum',
    sortable: true
  },
  {
    key: 'identityNumber',
    label: t('accounting.riskComplianceReports.kycCompliance.columns.identityNumber')
  },
  {
    key: 'expiryDate',
    label: t('accounting.riskComplianceReports.kycCompliance.columns.expiryDate'),
    type: 'date',
    sortable: true
  },
  {
    key: 'daysUntilExpiry',
    label: t('accounting.riskComplianceReports.kycCompliance.columns.daysUntilExpiry'),
    sortable: true
  },
  {
    key: 'status',
    label: t('accounting.riskComplianceReports.kycCompliance.columns.status'),
    type: 'status',
    sortable: true
  }
])
</script>
