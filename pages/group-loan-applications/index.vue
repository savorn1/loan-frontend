<template>
  <div>
    <PageHeader :title="t('groupLoanApplications.list.title')" :description="totalLabel" />

    <UCard>
      <template #header>
        <div class="flex flex-wrap items-center gap-3">
          <UInput
            v-model="search"
            icon="i-heroicons-magnifying-glass"
            :placeholder="t('groupLoanApplications.list.searchPlaceholder')"
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
        @select="
          (row: GroupLoanApplicationResponse) => router.push(`/group-loan-applications/${row.id}`)
        "
      >
        <template #empty-state>
          <EmptyState
            :icon="hasFilters ? 'i-heroicons-magnifying-glass' : 'i-heroicons-document-text'"
            :title="hasFilters ? t('common.noMatches') : t('groupLoanApplications.list.emptyTitle')"
            :description="
              hasFilters
                ? t('groupLoanApplications.list.emptyDescriptionFiltered')
                : t('groupLoanApplications.list.emptyDescription')
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
import type {
  GroupLoanApplicationResponse,
  GroupLoanApplicationStatus
} from '~/features/groups/types'
import type { BranchResponse } from '~/features/branches/types'
import type { ColumnDef, PageResponse } from '~/shared/types'

const { t } = useI18n()
const api = useApi()
const router = useRouter()

const {
  data: applicationsRaw,
  pending,
  error: fetchError
} = await useAsyncData('group-loan-applications', () =>
  api<PageResponse<GroupLoanApplicationResponse>>('/group-loan-applications', {
    query: { size: 1000 }
  })
)

const applications = computed(() => applicationsRaw.value?.content ?? [])

const { data: branchesData } = await useAsyncData('branches-all', () =>
  api<BranchResponse[]>('/branches')
)
const branchNameById = computed(
  () => new Map((branchesData.value ?? []).map((b) => [b.id, b.name]))
)
const branchFilterOptions = computed(() => [
  { label: t('groupLoanApplications.list.branchFilterAll'), value: '' },
  ...(branchesData.value ?? []).map((b) => ({ label: b.name, value: b.id }))
])
const branchFilter = ref<number | ''>('')

const columns = computed<ColumnDef<GroupLoanApplicationResponse>[]>(() => [
  { key: 'id', label: t('groupLoanApplications.list.columns.id'), sortable: true },
  {
    key: 'groupName',
    label: t('groupLoanApplications.list.columns.group'),
    sortable: true,
    type: 'link',
    href: (row) => `/groups/${row.groupId}`
  },
  {
    key: 'branchId',
    label: t('groupLoanApplications.list.columns.branch'),
    value: (row) =>
      row.branchId != null ? (branchNameById.value.get(row.branchId) ?? row.branchId) : '—'
  },
  {
    key: 'memberCount',
    label: t('groupLoanApplications.list.columns.members'),
    value: (row) => row.members.length
  },
  {
    key: 'totalRequested',
    label: t('groupLoanApplications.list.columns.totalRequested'),
    type: 'currency',
    value: (row) => row.members.reduce((sum, m) => sum + m.requestedAmount, 0)
  },
  {
    key: 'status',
    label: t('groupLoanApplications.list.columns.status'),
    type: 'status',
    sortable: true
  },
  {
    key: 'submittedAt',
    label: t('groupLoanApplications.list.columns.submitted'),
    type: 'datetime',
    sortable: true
  }
])

const statusOptions = computed<{ label: string; value: GroupLoanApplicationStatus | '' }[]>(() => [
  { label: t('groupLoanApplications.list.statusOptions.all'), value: '' },
  { label: t('groupLoanApplications.list.statusOptions.submitted'), value: 'SUBMITTED' },
  { label: t('groupLoanApplications.list.statusOptions.underReview'), value: 'UNDER_REVIEW' },
  { label: t('groupLoanApplications.list.statusOptions.approved'), value: 'APPROVED' },
  { label: t('groupLoanApplications.list.statusOptions.rejected'), value: 'REJECTED' },
  { label: t('groupLoanApplications.list.statusOptions.withdrawn'), value: 'WITHDRAWN' }
])
const statusFilter = ref<GroupLoanApplicationStatus | ''>('')
const { from: dateFrom, to: dateTo, inRange } = useDateRangeFilter()

const filteredByStatus = computed(() =>
  (applications.value ?? [])
    .filter((a) => !statusFilter.value || a.status === statusFilter.value)
    .filter((a) => branchFilter.value === '' || a.branchId === branchFilter.value)
    .filter((a) => inRange(a.createdAt))
)

const { search, page, pageSize, sort, total, rows } = useClientTable(filteredByStatus, {
  searchFields: ['groupName'],
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
    ? t('groupLoanApplications.list.totalOne')
    : t('groupLoanApplications.list.totalOther', { count })
})
</script>
