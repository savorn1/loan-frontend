<template>
  <div>
    <div v-if="exportable && rows.length > 0" class="flex justify-end mb-2">
      <UButton
        size="xs"
        variant="soft"
        color="gray"
        icon="i-heroicons-arrow-down-tray"
        @click="downloadCsv(resolvedExportFilename, columns, rows)"
      >
        {{ t('common.exportCsv') }}
      </UButton>
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
        <template v-for="column in columns" :key="column.key" #[`${column.key}-data`]="{ row }">
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
            v-for="column in columns"
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
import { deriveExportBaseName } from '~/shared/utils/csv'
import type { Button } from '#ui/types'

const props = withDefaults(
  defineProps<{
    rows: T[]
    columns: ColumnDef<T>[]
    loading?: boolean
    exportable?: boolean
    exportFilename?: string
    /** Adds a leading "No." column, numbered `rowNumberStart + index + 1`. */
    numbered?: boolean
    /** Offset for numbering, e.g. `(page - 1) * pageSize` so it stays continuous across pages. */
    rowNumberStart?: number
  }>(),
  {
    exportable: true,
    numbered: false,
    rowNumberStart: 0
  }
)

const ROW_NUMBER_KEY = '__rowNumber'

const emit = defineEmits<{ select: [row: T] }>()

const { t } = useI18n()
const route = useRoute()
const attrs = useAttrs()

const hasSelectListener = computed(() => !!attrs.onSelect)

const resolvedExportFilename = computed(
  () =>
    props.exportFilename ??
    `${deriveExportBaseName(route.path, route.params as Record<string, string | string[]>)}.csv`
)

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
  const mapped = props.columns.map((c) => ({
    key: c.key,
    label: c.label ?? humanize(c.key),
    sortable: c.sortable,
    class: c.class
  }))
  if (!props.numbered) return mapped
  return [{ key: ROW_NUMBER_KEY, label: t('common.no'), sortable: false, class: 'w-12' }, ...mapped]
})
</script>
