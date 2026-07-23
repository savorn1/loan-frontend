<template>
  <UTable :rows="rows" :columns="uColumns" :loading="loading" v-model:sort="sort" @select="(row: T) => emit('select', row)">
    <template v-for="column in columns" :key="column.key" #[`${column.key}-data`]="{ row }">
      <slot :name="`${column.key}-data`" :row="row">
        <ColumnValue :column="column" :row="row" />
      </slot>
    </template>
    <template v-if="$slots['empty-state']" #empty-state>
      <slot name="empty-state" />
    </template>
  </UTable>
</template>

<script setup lang="ts" generic="T extends Record<string, any>">
// Renders a whole table from a ColumnDef[] — the Backpack CRUD::addColumns()
// equivalent. Each column auto-renders via <ColumnValue> based on its `type`;
// a parent can still override any single column with its own `#key-data` slot
// (e.g. custom action buttons) exactly like plain <UTable>. Generic over the
// row type so `@select` comes back typed instead of `Record<string, any>`.
import type { ColumnDef } from '~/shared/types'

const props = defineProps<{
  rows: T[]
  columns: ColumnDef<T>[]
  loading?: boolean
}>()

const emit = defineEmits<{ select: [row: T] }>()

const sort = defineModel<{ column: string; direction: 'asc' | 'desc' } | undefined>('sort')

const uColumns = computed(() => props.columns.map(c => ({
  key: c.key,
  label: c.label ?? humanize(c.key),
  sortable: c.sortable,
  class: c.class
})))
</script>
