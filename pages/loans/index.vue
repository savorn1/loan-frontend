<template>
  <div>
    <PageHeader :title="t('loans.list.title')" :description="totalLabel">
      <template #actions>
        <UButton icon="i-heroicons-plus" @click="openCreate">{{ t('loans.list.newLoan') }}</UButton>
      </template>
    </PageHeader>

    <UCard>
      <template #header>
        <div class="flex flex-wrap items-center gap-3">
          <UInput
            v-model="search"
            icon="i-heroicons-magnifying-glass"
            :placeholder="t('loans.list.searchPlaceholder')"
            class="max-w-xs w-full sm:w-auto"
          >
            <template v-if="search" #trailing>
              <UButton
                color="gray"
                variant="link"
                icon="i-heroicons-x-mark"
                :aria-label="t('common.clearSearch')"
                :padded="false"
                @click="search = ''"
              />
            </template>
          </UInput>
          <USelectMenu
            v-model="statusFilter"
            :options="statusOptions"
            option-attribute="label"
            value-attribute="value"
            class="w-40"
          />
          <USelectMenu
            v-model="branchFilter"
            :options="branchFilterOptions"
            option-attribute="label"
            value-attribute="value"
            class="w-48"
          />
          <DateRangeFilter v-model:from="dateFrom" v-model:to="dateTo" />
          <UButton
            v-if="hasFilters"
            variant="ghost"
            color="gray"
            icon="i-heroicons-x-mark"
            @click="clearFilters"
          >
            {{ t('common.clearFilters') }}
          </UButton>
        </div>
      </template>

      <UAlert
        v-if="fetchError"
        color="red"
        variant="subtle"
        class="mb-4"
        :title="apiErrorMessage(fetchError)"
      />

      <DataTable
        v-model:sort="sort"
        :rows="rows"
        :columns="columns"
        :loading="pending"
        @select="(row: LoanResponse) => router.push(`/loans/${row.id}`)"
      >
        <template #empty-state>
          <EmptyState
            :icon="hasFilters ? 'i-heroicons-magnifying-glass' : 'i-heroicons-banknotes'"
            :title="hasFilters ? t('common.noMatches') : t('loans.list.empty.noLoansTitle')"
            :description="
              hasFilters
                ? t('loans.list.empty.noMatchesDescription')
                : t('loans.list.empty.noLoansDescription')
            "
          >
            <template v-if="!hasFilters" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">{{ t('loans.list.newLoan') }}</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>

    <UModal v-model="showCreate">
      <UCard>
        <template #header>
          <span class="font-semibold">{{ t('loans.list.modalTitle') }}</span>
        </template>
        <DynamicForm
          v-model="createForm"
          :fields="loanFields"
          :loading="creating"
          :error="error"
          :submit-label="t('common.create')"
          cancelable
          @submit="onCreate"
          @cancel="showCreate = false"
        />
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { CustomerResponse } from '~/features/customers/types'
import type { BranchResponse } from '~/features/branches/types'
import type { LoanRequest, LoanResponse, LoanStatus } from '~/features/loans/types'
import type { ColumnDef, FieldDef, PageResponse } from '~/shared/types'

const { t } = useI18n()
const api = useApi()
const router = useRouter()

const {
  data: loansRaw,
  pending,
  error: fetchError,
  refresh
} = await useAsyncData('loans', () => api<PageResponse<LoanResponse>>('/loans', { query: { size: 1000 } }))

const loans = computed(() => loansRaw.value?.content ?? [])

const { data: branchesData } = await useAsyncData('branches-all', () =>
  api<BranchResponse[]>('/branches')
)
const branchNameById = computed(() => new Map((branchesData.value ?? []).map((b) => [b.id, b.name])))
const branchFilterOptions = computed(() => [
  { label: t('loans.list.branchFilter.all'), value: '' },
  ...(branchesData.value ?? []).map((b) => ({ label: b.name, value: b.id }))
])
const branchFilter = ref<number | ''>('')

// Async-searched via the backend's CustomerFilterRequest.search — not preloaded, since
// the customer list can be far larger than any dropdown should hold client-side.
async function searchCustomers(query: string) {
  const result = await api<PageResponse<CustomerResponse>>('/customers', {
    query: { search: query, size: 20 }
  })
  return result.content.map((c) => ({ label: `${c.firstName} ${c.lastName} (#${c.id})`, value: c.id }))
}

const columns = computed<ColumnDef<LoanResponse>[]>(() => [
  { key: 'id', label: t('loans.list.columns.id'), sortable: true },
  { key: 'customerName', label: t('loans.list.columns.customer'), sortable: true },
  {
    key: 'branchId',
    label: t('loans.list.columns.branch'),
    value: (row) => (row.branchId != null ? branchNameById.value.get(row.branchId) ?? row.branchId : '—')
  },
  { key: 'principal', label: t('loans.list.columns.principal'), type: 'currency', sortable: true },
  { key: 'interestRate', label: t('loans.list.columns.rate'), type: 'percent', sortable: true },
  { key: 'termMonths', label: t('loans.list.columns.term'), sortable: true },
  { key: 'status', label: t('loans.list.columns.status'), type: 'status', sortable: true },
  { key: 'createdAt', label: t('loans.list.columns.created'), type: 'datetime', sortable: true }
])

const statusOptions = computed<{ label: string; value: LoanStatus | '' }[]>(() => [
  { label: t('loans.list.statusFilter.all'), value: '' },
  { label: t('loans.list.statusFilter.pending'), value: 'PENDING' },
  { label: t('loans.list.statusFilter.approved'), value: 'APPROVED' },
  { label: t('loans.list.statusFilter.active'), value: 'ACTIVE' },
  { label: t('loans.list.statusFilter.rejected'), value: 'REJECTED' },
  { label: t('loans.list.statusFilter.closed'), value: 'CLOSED' }
])
const statusFilter = ref<LoanStatus | ''>('')
const { from: dateFrom, to: dateTo, inRange } = useDateRangeFilter()

const filteredByStatus = computed(() =>
  (loans.value ?? [])
    .filter((l) => !statusFilter.value || l.status === statusFilter.value)
    .filter((l) => branchFilter.value === '' || l.branchId === branchFilter.value)
    .filter((l) => inRange(l.createdAt))
)

const { search, page, pageSize, sort, total, rows } = useClientTable(filteredByStatus, {
  searchFields: ['customerName', 'purpose'],
  pageSize: 10
})

const hasFilters = computed(
  () => !!search.value || !!statusFilter.value || branchFilter.value !== '' || !!dateFrom.value || !!dateTo.value
)

function clearFilters() {
  search.value = ''
  statusFilter.value = ''
  branchFilter.value = ''
  dateFrom.value = ''
  dateTo.value = ''
}

const totalLabel = computed(() => {
  const count = loans.value?.length ?? 0
  return count === 1 ? t('loans.list.totalOne') : t('loans.list.totalOther', { count })
})

// Declarative field defs for <DynamicForm>; required/select validation is
// handled by DynamicForm.
const loanFields = computed<FieldDef[]>(() => [
  {
    name: 'customerId',
    label: t('loans.list.fields.customer'),
    type: 'relationship',
    required: true,
    search: searchCustomers,
    placeholder: t('loans.list.fields.customerPlaceholder')
  },
  {
    name: 'principal',
    label: t('loans.list.columns.principal'),
    type: 'currency',
    required: true,
    hint: t('loans.list.fields.principalHint'),
    wrapper: 'half'
  },
  {
    name: 'interestRate',
    label: t('loans.list.fields.interestRate'),
    type: 'number',
    required: true,
    suffix: '%',
    min: 0.01,
    max: 100,
    step: 0.01,
    hint: t('loans.list.fields.interestRateHint'),
    wrapper: 'half'
  },
  {
    name: 'termMonths',
    label: t('loans.list.fields.term'),
    type: 'number',
    required: true,
    min: 1,
    max: 360,
    hint: t('loans.list.fields.termHint')
  },
  { name: 'purpose', label: t('loans.list.fields.purpose'), type: 'textarea' }
])

const { showCreate, creating, error, createForm, openCreate, onCreate } = useCrudModals<
  LoanResponse,
  LoanRequest
>('/loans', refresh, {
  entityName: t('loans.entities.loan'),
  createDefaults: () => ({
    customerId: undefined,
    principal: 1000,
    interestRate: 5,
    termMonths: 12,
    purpose: ''
  }),
  toForm: () => ({}),
  toPayload: (values) => ({
    customerId: values.customerId,
    principal: values.principal,
    interestRate: values.interestRate,
    termMonths: values.termMonths,
    purpose: values.purpose || undefined
  }),
  onCreated: async (created) => {
    await router.push(`/loans/${created.id}`)
  }
})
</script>
