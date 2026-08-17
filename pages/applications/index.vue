<template>
  <div>
    <PageHeader :title="t('applications.list.title')" :description="totalLabel">
      <template #actions>
        <UButton icon="i-heroicons-plus" @click="openCreate">{{
          t('applications.list.newApplication')
        }}</UButton>
      </template>
    </PageHeader>

    <UCard>
      <template #header>
        <div class="flex flex-wrap items-center gap-3">
          <UInput
            v-model="search"
            icon="i-heroicons-magnifying-glass"
            :placeholder="t('applications.list.searchPlaceholder')"
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
            class="w-full sm:w-40"
          />
          <USelectMenu
            v-model="branchFilter"
            :options="branchFilterOptions"
            option-attribute="label"
            value-attribute="value"
            class="w-full sm:w-48"
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
        numbered
        refreshable
        :row-number-start="(page - 1) * pageSize"
        @select="(row: ApplicationResponse) => router.push(`/applications/${row.id}`)"
        @refresh="refresh"
      >
        <template #empty-state>
          <EmptyState
            :icon="hasFilters ? 'i-heroicons-magnifying-glass' : 'i-heroicons-document-text'"
            :title="hasFilters ? t('common.noMatches') : t('applications.list.emptyTitle')"
            :description="
              hasFilters
                ? t('applications.list.emptyDescriptionFiltered')
                : t('applications.list.emptyDescription')
            "
          >
            <template v-if="!hasFilters" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">{{
                t('applications.list.newApplication')
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
          <span class="font-semibold">{{ t('applications.list.newApplication') }}</span>
        </template>
        <DynamicForm
          v-model="createForm"
          :fields="applicationFields"
          :loading="creating"
          :error="error"
          :submit-label="t('applications.list.submit')"
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
import type {
  ApplicationRequest,
  ApplicationResponse,
  ApplicationStatus
} from '~/features/loans/types'
import type { ColumnDef, FieldDef, PageResponse } from '~/shared/types'

const { t } = useI18n()
const api = useApi()
const toast = useToast()
const router = useRouter()

const {
  data: applicationsRaw,
  pending,
  error: fetchError,
  refresh
} = await useAsyncData('applications', () =>
  api<PageResponse<ApplicationResponse>>('/loans/applications', { query: { size: 1000 } })
)

const applications = computed(() => applicationsRaw.value?.content ?? [])

const { data: branchesData } = await useAsyncData('branches-all', () =>
  api<BranchResponse[]>('/branches')
)
const branchNameById = computed(
  () => new Map((branchesData.value ?? []).map((b) => [b.id, b.name]))
)
const branchFilterOptions = computed(() => [
  { label: t('applications.list.branchFilter.all'), value: '' },
  ...(branchesData.value ?? []).map((b) => ({ label: b.name, value: b.id }))
])
const branchFilter = ref<number | ''>('')

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

const columns = computed<ColumnDef<ApplicationResponse>[]>(() => [
  { key: 'applicationNo', label: t('applications.list.columns.reference') },
  { key: 'customerName', label: t('applications.list.columns.customer'), sortable: true },
  {
    key: 'branchId',
    label: t('applications.list.columns.branch'),
    value: (row) =>
      row.branchId != null ? (branchNameById.value.get(row.branchId) ?? row.branchId) : '—'
  },
  {
    key: 'requestedAmount',
    label: t('applications.list.columns.requested'),
    type: 'currency',
    sortable: true
  },
  { key: 'requestedTermMonths', label: t('applications.list.columns.term'), sortable: true },
  { key: 'status', label: t('applications.list.columns.status'), type: 'status', sortable: true },
  {
    key: 'submittedAt',
    label: t('applications.list.columns.submitted'),
    type: 'datetime',
    sortable: true
  }
])

const statusOptions = computed<{ label: string; value: ApplicationStatus | '' }[]>(() => [
  { label: t('applications.list.statusOptions.all'), value: '' },
  { label: t('applications.list.statusOptions.submitted'), value: 'SUBMITTED' },
  { label: t('applications.list.statusOptions.underReview'), value: 'UNDER_REVIEW' },
  { label: t('applications.list.statusOptions.approved'), value: 'APPROVED' },
  { label: t('applications.list.statusOptions.rejected'), value: 'REJECTED' },
  { label: t('applications.list.statusOptions.withdrawn'), value: 'WITHDRAWN' }
])
const statusFilter = ref<ApplicationStatus | ''>('')
const { from: dateFrom, to: dateTo, inRange } = useDateRangeFilter()

const filteredByStatus = computed(() =>
  (applications.value ?? [])
    .filter((a) => !statusFilter.value || a.status === statusFilter.value)
    .filter((a) => branchFilter.value === '' || a.branchId === branchFilter.value)
    .filter((a) => inRange(a.createdAt))
)

const { search, page, pageSize, sort, total, rows } = useClientTable(filteredByStatus, {
  searchFields: ['customerName', 'purpose'],
  pageSize: 10
})

const hasFilters = computed(
  () =>
    !!search.value ||
    !!statusFilter.value ||
    branchFilter.value !== '' ||
    !!dateFrom.value ||
    !!dateTo.value
)

function clearFilters() {
  search.value = ''
  statusFilter.value = ''
  branchFilter.value = ''
  dateFrom.value = ''
  dateTo.value = ''
}

const totalLabel = computed(() => {
  const count = applications.value?.length ?? 0
  return count === 1
    ? t('applications.list.totalOne')
    : t('applications.list.totalOther', { count })
})

const showCreate = ref(false)
const creating = ref(false)
const error = ref('')

const applicationFields = computed<FieldDef[]>(() => [
  {
    name: 'customerId',
    label: t('applications.list.fields.customer'),
    type: 'relationship',
    required: true,
    search: searchCustomers,
    placeholder: t('applications.list.fields.searchPlaceholder')
  },
  {
    name: 'requestedAmount',
    label: t('applications.list.fields.requestedAmount'),
    type: 'currency',
    required: true,
    hint: t('applications.list.fields.requestedAmountHint'),
    wrapper: 'half'
  },
  {
    name: 'requestedTermMonths',
    label: t('applications.list.fields.requestedTerm'),
    type: 'number',
    required: true,
    min: 1,
    max: 360,
    hint: t('applications.list.fields.requestedTermHint'),
    wrapper: 'half'
  },
  { name: 'purpose', label: t('applications.list.fields.purpose'), type: 'textarea' }
])

const createForm = ref<Record<string, any>>({})

function openCreate() {
  createForm.value = {
    customerId: undefined,
    requestedAmount: 1000,
    requestedTermMonths: 12,
    purpose: ''
  }
  error.value = ''
  showCreate.value = true
}

async function onCreate(values: Record<string, any>) {
  creating.value = true
  error.value = ''
  try {
    const payload: ApplicationRequest = {
      customerId: values.customerId,
      requestedAmount: values.requestedAmount,
      requestedTermMonths: values.requestedTermMonths,
      purpose: values.purpose || undefined
    }
    const created = await api<ApplicationResponse>('/loans/applications', {
      method: 'POST',
      body: payload
    })
    toast.add({ title: t('applications.list.toastCreated'), color: 'green' })
    showCreate.value = false
    await refresh()
    await router.push(`/applications/${created.id}`)
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    creating.value = false
  }
}
</script>
