<template>
  <div>
    <BackToReportsButton />
    <PageHeader
      :title="t('accounting.groupLendingReports.applications.title')"
      :description="t('accounting.groupLendingReports.applications.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.groupLendingReportsHeader') },
        { label: t('accounting.groupLendingReports.applications.title') }
      ]"
    />

    <UCard>
      <template #header>
        <UInput
          v-model="search"
          icon="i-heroicons-magnifying-glass"
          size="sm"
          class="w-full sm:w-64"
          :placeholder="t('accounting.groupLendingReports.applications.searchPlaceholder')"
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
            icon="i-heroicons-document-text"
            :title="t('accounting.groupLendingReports.applications.emptyTitle')"
            :description="t('accounting.groupLendingReports.applications.emptyDescription')"
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
import type { GroupLoanApplicationResponse } from '~/features/groups/types'
import type { BranchResponse } from '~/features/branches/types'
import type { PageResponse, ColumnDef } from '~/shared/types'

interface GroupApplicationRow {
  applicationNo: string
  group: string
  branch: string
  memberCount: number
  totalRequested: number
  totalApproved: number
  status: string
  submittedAt: string
}

const { t } = useI18n()
const api = useApi()

const {
  data: applicationsRaw,
  pending,
  error: fetchError
} = await useAsyncData('group-lending-applications', () =>
  api<PageResponse<GroupLoanApplicationResponse>>('/group-loan-applications', {
    query: { size: 1000 }
  })
)

const { data: branches } = await useAsyncData('group-lending-applications-branches', () =>
  api<BranchResponse[]>('/branches')
)
const branchNameById = computed(() => new Map((branches.value ?? []).map((b) => [b.id, b.name])))

const rows = computed<GroupApplicationRow[]>(() =>
  (applicationsRaw.value?.content ?? []).map((app) => ({
    applicationNo: app.applicationNo ?? String(app.id),
    group: app.groupName,
    branch:
      app.branchId != null ? (branchNameById.value.get(app.branchId) ?? String(app.branchId)) : '—',
    memberCount: app.members.length,
    totalRequested: app.members.reduce((sum, m) => sum + m.requestedAmount, 0),
    totalApproved: app.members.reduce((sum, m) => sum + (m.approvedAmount ?? 0), 0),
    status: app.status,
    submittedAt: app.submittedAt
  }))
)

const {
  search,
  page,
  pageSize,
  sort,
  total,
  rows: pagedRows
} = useClientTable(rows, {
  searchFields: ['applicationNo', 'group'],
  pageSize: 15
})

const columns = computed<ColumnDef<GroupApplicationRow>[]>(() => [
  {
    key: 'applicationNo',
    label: t('accounting.groupLendingReports.applications.columns.application'),
    sortable: true
  },
  {
    key: 'group',
    label: t('accounting.groupLendingReports.applications.columns.group'),
    sortable: true
  },
  { key: 'branch', label: t('accounting.groupLendingReports.applications.columns.branch') },
  {
    key: 'memberCount',
    label: t('accounting.groupLendingReports.applications.columns.memberCount'),
    sortable: true
  },
  {
    key: 'totalRequested',
    label: t('accounting.groupLendingReports.applications.columns.totalRequested'),
    type: 'currency',
    sortable: true
  },
  {
    key: 'totalApproved',
    label: t('accounting.groupLendingReports.applications.columns.totalApproved'),
    type: 'currency',
    sortable: true
  },
  {
    key: 'status',
    label: t('accounting.groupLendingReports.applications.columns.status'),
    type: 'status',
    sortable: true
  },
  {
    key: 'submittedAt',
    label: t('accounting.groupLendingReports.applications.columns.submittedAt'),
    type: 'date',
    sortable: true
  }
])
</script>
