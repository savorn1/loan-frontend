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
          <USelectMenu
            v-model="customerFilter"
            :searchable="searchCustomerOptions"
            searchable-lazy
            option-attribute="label"
            value-attribute="value"
            :placeholder="t('loans.list.customerFilter.all')"
            class="w-full sm:w-48"
          />
          <USelectMenu
            v-model="branchFilter"
            :options="branchFilterOptions"
            option-attribute="label"
            value-attribute="value"
            class="w-full sm:w-48"
          />
          <USelectMenu
            v-model="loanProductFilter"
            :options="loanProductFilterOptions"
            option-attribute="label"
            value-attribute="value"
            class="w-full sm:w-48"
          />
          <div class="flex items-center gap-1 w-full sm:w-auto">
            <UInput
              :model-value="principalMin"
              type="number"
              :placeholder="t('loans.list.principalFilter.min')"
              class="flex-1 sm:w-28"
              @update:model-value="(v: string) => (principalMin = v === '' ? undefined : Number(v))"
            />
            <span class="text-gray-400 dark:text-gray-500 text-sm">–</span>
            <UInput
              :model-value="principalMax"
              type="number"
              :placeholder="t('loans.list.principalFilter.max')"
              class="flex-1 sm:w-28"
              @update:model-value="(v: string) => (principalMax = v === '' ? undefined : Number(v))"
            />
          </div>
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
        numbered
        :row-number-start="(page - 1) * pageSize"
        @select="(row: LoanResponse) => router.push(`/loans/${row.id}`)"
      >
        <template #actions-data="{ row }">
          <div v-if="isAdmin && row.status === 'PENDING'" class="flex gap-1 justify-end">
            <UButton
              size="2xs"
              variant="soft"
              icon="i-heroicons-pencil"
              :aria-label="t('common.edit')"
              @click.stop="openEdit(row)"
            />
            <UButton
              size="2xs"
              color="red"
              variant="soft"
              icon="i-heroicons-trash"
              :aria-label="t('common.delete')"
              @click.stop="confirmDelete = row"
            />
          </div>
        </template>
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
              <UButton icon="i-heroicons-plus" @click="openCreate">{{
                t('loans.list.newLoan')
              }}</UButton>
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
        <UAlert
          color="orange"
          variant="subtle"
          icon="i-heroicons-exclamation-triangle"
          class="mb-4"
          :title="t('loans.list.directCreateWarningTitle')"
          :description="t('loans.list.directCreateWarningDescription')"
        />
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

    <UModal v-model="showEdit">
      <UCard>
        <template #header>
          <span class="font-semibold">{{ t('loans.list.editModalTitle') }}</span>
        </template>
        <DynamicForm
          v-model="editForm"
          :fields="loanFields"
          :loading="editing"
          :error="editError"
          :submit-label="t('common.saveChanges')"
          cancelable
          @submit="onEdit"
          @cancel="showEdit = false"
        />
      </UCard>
    </UModal>

    <ConfirmModal
      :model-value="confirmDelete !== null"
      :title="t('loans.list.confirmDelete.title')"
      :description="t('loans.list.confirmDelete.description')"
      :confirm-label="t('common.delete')"
      color="red"
      :loading="deleting"
      @update:model-value="
        (v: boolean) => {
          if (!v) confirmDelete = null
        }
      "
      @confirm="onDelete"
    />
  </div>
</template>

<script setup lang="ts">
import type { CustomerResponse } from '~/features/customers/types'
import type { BranchResponse } from '~/features/branches/types'
import type { LoanProductResponse } from '~/features/loan-products/types'
import type { LoanRequest, LoanResponse } from '~/features/loans/types'
import type { ColumnDef, FieldDef, PageResponse } from '~/shared/types'

const { t } = useI18n()
const api = useApi()
const router = useRouter()
const { isAdmin } = storeToRefs(useAuth())
const { formatTermLength } = useTermUnit()

const page = ref(1)
const pageSize = ref(10)
const sort = ref<{ column: string; direction: 'asc' | 'desc' } | undefined>(undefined)
const { from: dateFrom, to: dateTo } = useDateRangeFilter()
const customerFilter = ref<number | ''>('')
const branchFilter = ref<number | ''>('')
const loanProductFilter = ref<string | ''>('')
const principalMin = ref<number | undefined>(undefined)
const principalMax = ref<number | undefined>(undefined)

function buildQuery() {
  return {
    page: page.value,
    size: pageSize.value,
    sortBy: sort.value?.column ?? 'createdAt',
    sortOrder: sort.value?.direction ?? 'desc',
    customerId: customerFilter.value || undefined,
    branchId: branchFilter.value || undefined,
    loanProductId: loanProductFilter.value || undefined,
    minPrincipal: principalMin.value,
    maxPrincipal: principalMax.value,
    dateFrom: dateFrom.value || undefined,
    dateTo: dateTo.value || undefined
  }
}

const {
  data: loansPage,
  pending,
  error: fetchError,
  refresh
} = await useAsyncData('loans', () =>
  api<PageResponse<LoanResponse>>('/loans', { query: buildQuery() })
)

const rows = computed(() => loansPage.value?.content ?? [])
const total = computed(() => loansPage.value?.totalElements ?? 0)

watch(page, () => refresh())
watch([pageSize, customerFilter, branchFilter, loanProductFilter, dateFrom, dateTo], () => {
  page.value = 1
  refresh()
})

// Debounced so we don't fire a request on every keystroke.
let principalFilterTimer: ReturnType<typeof setTimeout>
watch([principalMin, principalMax], () => {
  clearTimeout(principalFilterTimer)
  principalFilterTimer = setTimeout(() => {
    page.value = 1
    refresh()
  }, 400)
})
watch(
  sort,
  () => {
    page.value = 1
    refresh()
  },
  { deep: true }
)

const { data: branchesData } = await useAsyncData('branches-all', () =>
  api<BranchResponse[]>('/branches')
)
const branchNameById = computed(
  () => new Map((branchesData.value ?? []).map((b) => [b.id, b.name]))
)
const branchFilterOptions = computed(() => [
  { label: t('loans.list.branchFilter.all'), value: '' },
  ...(branchesData.value ?? []).map((b) => ({ label: b.name, value: b.id }))
])

// Unlike the create form's loanProductOptions (PUBLISHED only), the filter needs
// every product a loan could actually reference, including ones since retired.
const { data: loanProductsData } = await useAsyncData('loan-products-all', () =>
  api<LoanProductResponse[]>('/loan-products')
)
const loanProductFilterOptions = computed(() => [
  { label: t('loans.list.loanProductFilter.all'), value: '' },
  ...(loanProductsData.value ?? []).map((p) => ({ label: `${p.name} (${p.code})`, value: p.id }))
])

const hasFilters = computed(
  () =>
    customerFilter.value !== '' ||
    branchFilter.value !== '' ||
    loanProductFilter.value !== '' ||
    principalMin.value !== undefined ||
    principalMax.value !== undefined ||
    !!dateFrom.value ||
    !!dateTo.value
)

function clearFilters() {
  customerFilter.value = ''
  branchFilter.value = ''
  loanProductFilter.value = ''
  principalMin.value = undefined
  principalMax.value = undefined
  dateFrom.value = ''
  dateTo.value = ''
}

// Async-searched via the backend's CustomerFilterRequest.search — not preloaded, since
// the customer list can be far larger than any dropdown should hold client-side.
async function searchCustomers(query: string) {
  const result = await api<PageResponse<CustomerResponse>>('/customers', {
    query: { search: query, size: 20 }
  })
  return result.content.map((c) => ({
    label: `${c.firstName} ${c.lastName} (#${c.id})`,
    value: c.id
  }))
}

// Wraps searchCustomers for the filter dropdown: prepends an "All customers"
// option, and keeps the current selection visible even when it falls outside
// the latest search results (mirrors FieldRelationship's #id fallback).
async function searchCustomerOptions(query: string) {
  const options = [
    { label: t('loans.list.customerFilter.all'), value: '' as number | '' },
    ...(await searchCustomers(query))
  ]
  if (customerFilter.value === '' || options.some((o) => o.value === customerFilter.value)) {
    return options
  }
  return [{ label: `#${customerFilter.value}`, value: customerFilter.value }, ...options]
}

const columns = computed<ColumnDef<LoanResponse>[]>(() => [
  { key: 'loanNo', label: t('loans.list.columns.reference') },
  // customerName is stitched in per-row from customer-service, not a Loan column — not sortable server-side.
  { key: 'customerName', label: t('loans.list.columns.customer') },
  {
    key: 'loanProductName',
    label: t('loans.list.columns.loanProduct'),
    value: (row) => row.loanProductName ?? '—'
  },
  {
    key: 'branchId',
    label: t('loans.list.columns.branch'),
    value: (row) =>
      row.branchId != null ? (branchNameById.value.get(row.branchId) ?? row.branchId) : '—'
  },
  { key: 'principal', label: t('loans.list.columns.principal'), type: 'currency', sortable: true },
  { key: 'interestRate', label: t('loans.list.columns.rate'), type: 'percent', sortable: true },
  {
    key: 'termMonths',
    label: t('loans.list.columns.term'),
    sortable: true,
    value: (row) => formatTermLength(row.termMonths, row.termUnit)
  },
  { key: 'status', label: t('loans.list.columns.status'), type: 'status', sortable: true },
  { key: 'createdAt', label: t('loans.list.columns.created'), type: 'datetime', sortable: true },
  { key: 'actions', label: '', class: 'text-right' }
])

const totalLabel = computed(() => {
  const count = total.value
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
    max: 3650,
    hint: t('loans.list.fields.termHint')
  },
  {
    name: 'termUnit',
    label: t('loans.list.fields.termUnit'),
    type: 'select',
    required: true,
    default: 'MONTH',
    options: [
      { label: t('loanConfig.termTemplates.units.day'), value: 'DAY' },
      { label: t('loanConfig.termTemplates.units.month'), value: 'MONTH' },
      { label: t('loanConfig.termTemplates.units.year'), value: 'YEAR' }
    ]
  },
  { name: 'purpose', label: t('loans.list.fields.purpose'), type: 'textarea' }
])

const {
  showCreate,
  creating,
  error,
  createForm,
  openCreate,
  onCreate,
  showEdit,
  editing,
  editError,
  editForm,
  openEdit,
  onEdit,
  deleting,
  confirmDelete,
  onDelete
} = useCrudModals<LoanResponse, LoanRequest>('/loans', refresh, {
  entityName: t('loans.entities.loan'),
  createDefaults: () => ({
    customerId: undefined,
    principal: 1000,
    interestRate: 5,
    termMonths: 12,
    termUnit: 'MONTH',
    purpose: ''
  }),
  toForm: (row) => ({
    customerId: row.customerId,
    principal: row.principal,
    interestRate: row.interestRate,
    termMonths: row.termMonths,
    termUnit: row.termUnit,
    purpose: row.purpose ?? ''
  }),
  toPayload: (values) => ({
    customerId: values.customerId,
    principal: values.principal,
    interestRate: values.interestRate,
    termMonths: values.termMonths,
    termUnit: values.termUnit,
    purpose: values.purpose || undefined
  }),
  onCreated: async (created) => {
    await router.push(`/loans/${created.id}`)
  }
})
</script>
