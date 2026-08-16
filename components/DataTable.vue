<template>
  <div>
    <div
      v-if="refreshable || ((exportable || showColumnToggle) && rows.length > 0)"
      class="flex justify-end items-center gap-2 mb-2"
    >
      <UButton
        v-if="refreshable"
        size="xs"
        variant="soft"
        color="gray"
        icon="i-heroicons-arrow-path"
        :loading="loading"
        @click="emit('refresh')"
      >
        {{ t('common.refresh') }}
      </UButton>

      <UPopover v-if="showColumnToggle && rows.length > 0" :popper="{ placement: 'bottom-end' }">
        <UButton size="xs" variant="soft" color="gray" icon="i-heroicons-view-columns">
          {{ t('common.columns') }}
        </UButton>

        <template #panel>
          <div class="p-3 space-y-2 min-w-[12rem]">
            <UCheckbox
              v-for="column in columns"
              :key="column.key"
              :model-value="!hiddenColumnKeys.has(column.key)"
              :label="column.label || humanize(column.key)"
              @update:model-value="(v: boolean) => setColumnVisible(column.key, v)"
            />
          </div>
        </template>
      </UPopover>

      <UDropdown
        v-if="exportable && rows.length > 0"
        :items="exportItems"
        :popper="{ placement: 'bottom-end' }"
      >
        <UButton size="xs" variant="soft" color="gray" icon="i-heroicons-arrow-down-tray">
          {{ t('common.export') }}
        </UButton>
      </UDropdown>
    </div>

    <div
      v-if="loading && rows.length === 0"
      class="flex flex-col items-center justify-center gap-3 py-14"
    >
      <UIcon
        name="i-heroicons-arrow-path"
        class="w-6 h-6 text-gray-400 dark:text-gray-500 animate-spin"
      />
      <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('common.loading') }}</p>
    </div>

    <div v-else-if="rows.length === 0">
      <slot name="empty-state">
        <EmptyState icon="i-heroicons-circle-stack" :title="t('common.noData')" />
      </slot>
    </div>

    <template v-else>
      <UTable
        v-model:sort="sort"
        :rows="themedRows"
        :columns="uColumns"
        :loading="loading"
        :ui="tableUi"
        :sort-button="sortButtonOverride"
        class="hidden sm:block"
        @select="(row: T) => emit('select', row)"
      >
        <template v-if="numbered" #[`${ROW_NUMBER_KEY}-data`]="{ index }">
          {{ rowNumberStart + index + 1 }}
        </template>
        <template
          v-for="column in visibleColumns"
          :key="column.key"
          #[`${column.key}-data`]="{ row }"
        >
          <slot :name="`${column.key}-data`" :row="row">
            <ColumnValue :column="column" :row="row" />
          </slot>
        </template>
      </UTable>

      <!-- Mobile fallback: a horizontally-scrolling table is unreadable on narrow
           screens, so stack each row as a label/value card below `sm`. -->
      <div class="sm:hidden space-y-3">
        <div
          v-for="(row, index) in rows"
          :key="index"
          class="rounded-lg border border-gray-200 dark:border-gray-800 p-3"
          :class="{ 'active:bg-gray-50 dark:active:bg-gray-800/50': hasSelectListener }"
          @click="emit('select', row)"
        >
          <div
            v-for="column in visibleColumns"
            :key="column.key"
            class="flex items-start justify-between gap-3 py-1 text-sm first:pt-0 last:pb-0"
          >
            <span class="text-gray-500 dark:text-gray-400 shrink-0">{{
              column.label ?? humanize(column.key)
            }}</span>
            <span class="text-right font-medium text-gray-900 dark:text-white min-w-0">
              <slot :name="`${column.key}-data`" :row="row">
                <ColumnValue :column="column" :row="row" />
              </slot>
            </span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts" generic="T extends Record<string, any>">
import type { ColumnDef } from '~/shared/types'
import { downloadCsv } from '~/shared/utils/csv'
import { downloadXlsx } from '~/shared/utils/xlsx'
import { downloadPdf } from '~/shared/utils/pdf'
import { copyTableToClipboard, deriveExportBaseName } from '~/shared/utils/tableExport'
import type { Button } from '#ui/types'

const props = withDefaults(
  defineProps<{
    rows: T[]
    columns: ColumnDef<T>[]
    loading?: boolean
    exportable?: boolean
    /** Base filename (no extension) — each export format appends its own. */
    exportFilename?: string
    /** Lets users show/hide individual columns via a "Columns" popover. */
    columnsToggleable?: boolean
    /** Shows a "Refresh" button that emits `refresh` — the caller re-fetches. */
    refreshable?: boolean
    /** Adds a leading "No." column, numbered `rowNumberStart + index + 1`. */
    numbered?: boolean
    /** Offset for numbering, e.g. `(page - 1) * pageSize` so it stays continuous across pages. */
    rowNumberStart?: number
  }>(),
  {
    exportable: true,
    columnsToggleable: true,
    refreshable: false,
    numbered: false,
    rowNumberStart: 0
  }
)

const ROW_NUMBER_KEY = '__rowNumber'

const emit = defineEmits<{ select: [row: T]; refresh: [] }>()

const { t } = useI18n()
const route = useRoute()
const attrs = useAttrs()
const toast = useToast()

const hasSelectListener = computed(() => !!attrs.onSelect)

const resolvedExportBaseName = computed(
  () =>
    props.exportFilename ??
    deriveExportBaseName(route.path, route.params as Record<string, string | string[]>)
)

function exportCsv() {
  downloadCsv(`${resolvedExportBaseName.value}.csv`, props.columns, props.rows)
}
function exportExcel() {
  downloadXlsx(`${resolvedExportBaseName.value}.xlsx`, props.columns, props.rows)
}
function exportPdf() {
  downloadPdf(`${resolvedExportBaseName.value}.pdf`, props.columns, props.rows)
}
async function copyTable() {
  try {
    await copyTableToClipboard(props.columns, props.rows)
    toast.add({ title: t('common.copiedToClipboard'), color: 'green' })
  } catch {
    toast.add({ title: t('common.copyFailed'), color: 'red' })
  }
}

const exportItems = computed(() => [
  [
    { label: t('common.exportCsv'), icon: 'i-heroicons-table-cells', click: exportCsv },
    { label: t('common.exportExcel'), icon: 'i-heroicons-document-chart-bar', click: exportExcel },
    { label: t('common.exportPdf'), icon: 'i-heroicons-document-text', click: exportPdf }
  ],
  [{ label: t('common.copyTable'), icon: 'i-heroicons-clipboard-document', click: copyTable }]
])

// Hidden-by-key (not index) so visibility survives column list re-renders as
// long as keys stay the same.
const hiddenColumnKeys = ref<Set<string>>(new Set())

const showColumnToggle = computed(() => props.columnsToggleable && props.columns.length > 1)

const visibleColumns = computed(() =>
  props.columns.filter((c) => !hiddenColumnKeys.value.has(c.key))
)

function setColumnVisible(key: string, visible: boolean) {
  // Always leave at least one column visible — hiding the last one would
  // render an empty table with no way back to the toggle.
  if (!visible && visibleColumns.value.length <= 1) return
  const next = new Set(hiddenColumnKeys.value)
  if (visible) next.delete(key)
  else next.add(key)
  hiddenColumnKeys.value = next
}

const sort = defineModel<{ column: string; direction: 'asc' | 'desc' } | undefined>('sort')

const { tableUi, rowEvenClass, sortButtonClass } = useTableTheme()

const themedRows = computed(() =>
  rowEvenClass.value
    ? props.rows.map((row, index) =>
        index % 2 === 1 ? { ...row, class: rowEvenClass.value } : row
      )
    : props.rows
)

// UTable's `sort-button` prop falls back to a static default that ignores
// `:ui`, so per-theme sort-button styling has to go through this prop
// directly. Passing only `class` lets icon/color/variant still fall through
// from `ui.default.sortButton` — see the comment on tableThemes in app.config.ts.
// `class` isn't part of Nuxt UI's `Button` prop type (it's normally themed via
// `ui.default.sortButton.class` instead), but UButton does accept it at runtime.
const sortButtonOverride = computed<(Button & { class?: string }) | undefined>(() =>
  sortButtonClass.value ? { class: sortButtonClass.value } : undefined
)

const uColumns = computed(() => {
  const mapped = visibleColumns.value.map((c) => ({
    key: c.key,
    label: c.label ?? humanize(c.key),
    sortable: c.sortable,
    class: c.class
  }))
  if (!props.numbered) return mapped
  return [{ key: ROW_NUMBER_KEY, label: t('common.no'), sortable: false, class: 'w-12' }, ...mapped]
})
</script>
