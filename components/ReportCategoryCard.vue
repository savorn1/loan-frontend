<template>
  <UCard class="mt-6">
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <span class="font-semibold">{{ title }}</span>
        <UInput
          v-model="search"
          icon="i-heroicons-magnifying-glass"
          size="sm"
          class="w-56"
          :placeholder="t('common.searchEllipsis')"
        />
      </div>
    </template>
    <DataTable
      :rows="filteredTiles"
      :columns="columns"
      :exportable="false"
      @select="(row: ReportTile) => router.push(row.to)"
    >
      <template #label-data="{ row }">
        <div class="flex items-center gap-3">
          <div
            class="shrink-0 rounded-lg p-2 bg-primary-50 dark:bg-primary-400/10 text-primary-500 dark:text-primary-300"
          >
            <UIcon :name="row.icon" class="w-5 h-5" />
          </div>
          <span class="font-medium text-gray-900 dark:text-white">{{ row.label }}</span>
        </div>
      </template>
      <template #empty-state>
        <EmptyState
          icon="i-heroicons-magnifying-glass"
          :title="t('common.noMatches')"
          :description="t('common.nothingMatches', { query: search })"
        />
      </template>
    </DataTable>
  </UCard>
</template>

<script setup lang="ts">
// One category section on the reports index page (pages/reports/index.vue) — extracted
// because that page used to repeat this exact card (search input + DataTable + slots) once
// per category, ~19 times, differing only in the title and which tile array was passed in.
import type { ReportTile } from '~/features/reports/types'
import type { ColumnDef } from '~/shared/types'

const props = defineProps<{
  title: string
  tiles: ReportTile[]
}>()

const { t } = useI18n()
const router = useRouter()

const search = ref('')
const filteredTiles = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return props.tiles
  return props.tiles.filter(
    (tile) => tile.label.toLowerCase().includes(q) || tile.description.toLowerCase().includes(q)
  )
})

const columns = computed<ColumnDef<ReportTile>[]>(() => [
  { key: 'label', label: t('admin.reports.reportsTable.columns.name') },
  { key: 'description', label: t('admin.reports.reportsTable.columns.description') },
  {
    key: 'actions',
    label: '',
    type: 'link',
    value: () => t('admin.reports.reportsTable.open'),
    href: (row) => row.to
  }
])
</script>
