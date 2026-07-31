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
        </div>
      </template>

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
import type { LoanRequest, LoanResponse, LoanStatus } from '~/features/loans/types'
import type { ColumnDef, FieldDef, PageResponse } from '~/shared/types'

const { t } = useI18n()
const api = useApi()
const toast = useToast()
const router = useRouter()

const {
  data: loansRaw,
  pending,
  refresh
} = await useAsyncData('loans', () => api<PageResponse<LoanResponse>>('/loans', { query: { size: 1000 } }))

const loans = computed(() => loansRaw.value?.content ?? [])

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

const filteredByStatus = computed(() =>
  statusFilter.value
    ? (loans.value ?? []).filter((l) => l.status === statusFilter.value)
    : loans.value
)

const { search, page, pageSize, sort, total, rows } = useClientTable(filteredByStatus, {
  searchFields: ['customerName', 'purpose'],
  pageSize: 10
})

const hasFilters = computed(() => !!search.value || !!statusFilter.value)

const totalLabel = computed(() => {
  const count = loans.value?.length ?? 0
  return count === 1 ? t('loans.list.totalOne') : t('loans.list.totalOther', { count })
})

const showCreate = ref(false)
const creating = ref(false)
const error = ref('')

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

const createForm = ref<Record<string, any>>({})

function openCreate() {
  createForm.value = {
    customerId: undefined,
    principal: 1000,
    interestRate: 5,
    termMonths: 12,
    purpose: ''
  }
  error.value = ''
  showCreate.value = true
}

async function onCreate(values: Record<string, any>) {
  creating.value = true
  error.value = ''
  try {
    const payload: LoanRequest = {
      customerId: values.customerId,
      principal: values.principal,
      interestRate: values.interestRate,
      termMonths: values.termMonths,
      purpose: values.purpose || undefined
    }
    const created = await api<LoanResponse>('/loans', { method: 'POST', body: payload })
    toast.add({ title: t('loans.list.toastCreated'), color: 'green' })
    showCreate.value = false
    await refresh()
    await router.push(`/loans/${created.id}`)
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    creating.value = false
  }
}
</script>
