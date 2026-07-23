// Client-side search + sort + pagination for the list pages (customers, loans,
// payments) whose backends return a bare array rather than a paginated response
// (only /auth/users paginates server-side — see UserFilterRequest/PageResponse).
//
// Sorting mirrors UTable's own internal comparator (see @nuxt/ui's Table.vue
// `defaultSort`) so that pre-sorting the full list before slicing a page out of
// it stays consistent with the header-click sort UI that UTable renders when a
// column is marked `sortable: true` and `sort` is bound with `v-model:sort`.
type SortState = { column: string; direction: 'asc' | 'desc' } | undefined

export function useClientTable<T extends Record<string, any>>(
  source: Ref<T[] | null | undefined>,
  options: { searchFields?: (keyof T)[]; pageSize?: number } = {}
) {
  const search = ref('')
  const page = ref(1)
  const sort = ref<SortState>(undefined)
  const pageSize = ref(options.pageSize ?? 10)

  const filtered = computed(() => {
    const rows = source.value ?? []
    const query = search.value.trim().toLowerCase()
    if (!query || !options.searchFields?.length) return rows
    return rows.filter(row =>
      options.searchFields!.some(field => String(row[field] ?? '').toLowerCase().includes(query))
    )
  })

  const sorted = computed(() => {
    const column = sort.value?.column
    const direction = sort.value?.direction
    if (!column) return filtered.value
    return [...filtered.value].sort((a, b) => {
      const av = a[column]
      const bv = b[column]
      if (av === bv) return 0
      if (direction === 'asc') return av < bv ? -1 : 1
      return av > bv ? -1 : 1
    })
  })

  const total = computed(() => sorted.value.length)
  const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

  const rows = computed(() => {
    const start = (page.value - 1) * pageSize.value
    return sorted.value.slice(start, start + pageSize.value)
  })

  // Changing the page size (via <DataPagination>) invalidates the current
  // page offset the same way a new search or a refreshed source list does.
  watch([search, source, pageSize], () => { page.value = 1 })
  watch(pageCount, (count) => { if (page.value > count) page.value = count })

  return { search, page, pageSize, sort, total, pageCount, rows }
}
