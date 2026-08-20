<template>
  <div>
    <BackToReportsButton />
    <PageHeader
      :title="t('accounting.groupLendingReports.groups.title')"
      :description="t('accounting.groupLendingReports.groups.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.groupLendingReportsHeader') },
        { label: t('accounting.groupLendingReports.groups.title') }
      ]"
    />

    <UCard>
      <template #header>
        <UInput
          v-model="search"
          icon="i-heroicons-magnifying-glass"
          size="sm"
          class="w-full sm:w-64"
          :placeholder="t('accounting.groupLendingReports.groups.searchPlaceholder')"
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
            icon="i-heroicons-user-group"
            :title="t('accounting.groupLendingReports.groups.emptyTitle')"
            :description="t('accounting.groupLendingReports.groups.emptyDescription')"
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
import type { GroupResponse } from '~/features/groups/types'
import type { PageResponse, ColumnDef } from '~/shared/types'

const { t } = useI18n()
const api = useApi()

const {
  data: groupsRaw,
  pending,
  error: fetchError
} = await useAsyncData('group-lending-groups', () =>
  api<PageResponse<GroupResponse>>('/groups', { query: { size: 1000 } })
)
const groups = computed(() => groupsRaw.value?.content ?? [])

const { search, page, pageSize, sort, total, rows } = useClientTable(groups, {
  searchFields: ['name', 'code', 'leaderName'],
  pageSize: 15
})

const columns = computed<ColumnDef<GroupResponse>[]>(() => [
  { key: 'name', label: t('accounting.groupLendingReports.groups.columns.name'), sortable: true },
  { key: 'code', label: t('accounting.groupLendingReports.groups.columns.code'), sortable: true },
  {
    key: 'branchName',
    label: t('accounting.groupLendingReports.groups.columns.branch'),
    value: (row) => row.branchName ?? '—'
  },
  {
    key: 'leaderName',
    label: t('accounting.groupLendingReports.groups.columns.leader'),
    value: (row) => row.leaderName ?? '—'
  },
  {
    key: 'memberCount',
    label: t('accounting.groupLendingReports.groups.columns.memberCount'),
    sortable: true
  },
  {
    key: 'formationDate',
    label: t('accounting.groupLendingReports.groups.columns.formationDate'),
    type: 'date',
    sortable: true
  },
  {
    key: 'status',
    label: t('accounting.groupLendingReports.groups.columns.status'),
    type: 'status',
    sortable: true
  }
])
</script>
