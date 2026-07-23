<template>
  <template v-if="column.type === 'status'">
    <StatusBadge :status="String(rawValue)" />
  </template>
  <template v-else-if="column.type === 'link'">
    <NuxtLink :to="column.href!(row)" class="text-primary-500 font-medium" @click.stop>{{
      text
    }}</NuxtLink>
  </template>
  <template v-else-if="column.type === 'boolean'">
    <UBadge v-if="rawValue || column.falseLabel !== ''" :color="boolColor" variant="subtle">
      {{ rawValue ? (column.trueLabel ?? 'Yes') : (column.falseLabel ?? 'No') }}
    </UBadge>
  </template>
  <template v-else-if="column.type === 'badge'">
    <UBadge :color="badgeColor" variant="subtle">{{ text }}</UBadge>
  </template>
  <template v-else>{{ text }}</template>
</template>

<script setup lang="ts">
// Renders a single table cell from a ColumnDef — the Backpack CRUD column-type
// equivalent (see shared/types.ts). <DataTable> mounts one of these per column
// per row unless the parent overrides that column with its own slot.
import type { ColumnDef } from '~/shared/types'

const props = defineProps<{ column: ColumnDef; row: Record<string, any> }>()

const rawValue = computed(() =>
  props.column.value ? props.column.value(props.row) : props.row[props.column.key]
)

function isEmpty(value: unknown) {
  return value === null || value === undefined || value === ''
}

// Forces a compile error here if ColumnType ever gains a variant that isn't
// wired into formatSingle's switch below.
function assertNever(value: never): never {
  throw new Error(`Unhandled ColumnType: ${value}`)
}

// Formats a single value per the column's type — shared by the plain-value
// case and both sides of a `to`-range (e.g. minAmount – maxAmount).
function formatSingle(value: unknown): string {
  const type = props.column.type ?? 'text'
  switch (type) {
    case 'currency':
      return formatCurrency(value as number)
    case 'percent':
      return isEmpty(value) ? '—' : `${value}%`
    case 'date':
      return formatDate(value as string)
    case 'datetime':
      return formatDateTime(value as string)
    case 'enum':
      return formatEnum(value as string)
    // status/link/boolean/badge fall through here too (formatSingle still runs
    // for them via `text`, even though the template never renders that value) —
    // same plain-text formatting as text/number.
    case 'text':
    case 'number':
    case 'status':
    case 'link':
    case 'boolean':
    case 'badge':
      return isEmpty(value) ? '—' : String(value)
    default:
      return assertNever(type)
  }
}

const text = computed(() => {
  const c = props.column
  const prefix = c.prefix ? c.prefix(props.row) : ''
  const suffix = typeof c.suffix === 'function' ? c.suffix(props.row) : (c.suffix ?? '')
  const from = formatSingle(rawValue.value)
  if (!c.to) return `${prefix}${from}${suffix}`
  const toValue = props.row[c.to]
  const to = isEmpty(toValue) ? (c.toEmpty ?? '—') : formatSingle(toValue)
  return `${prefix}${from} – ${to}${suffix}`
})

// Cast to `any` — ColumnDef's color fields are plain strings so callers don't
// need to import Nuxt UI's own (generated, hard-to-name) BadgeColor union.
const boolColor = computed<any>(() =>
  rawValue.value ? (props.column.trueColor ?? 'primary') : (props.column.falseColor ?? 'gray')
)

const badgeColor = computed<any>(() => {
  const c = props.column
  return typeof c.color === 'function' ? c.color(props.row) : (c.color ?? 'gray')
})
</script>
