// Client-side date-range filter, shaped like useClientTable.ts. Each caller
// composes it into their own pre-filter computed the same way pages already
// compose status/search filters before handing rows to useClientTable.
export function useDateRangeFilter() {
  const from = ref('') // ISO yyyy-MM-dd, '' = unset
  const to = ref('')

  function inRange(dateValue: string | null | undefined): boolean {
    if (!from.value && !to.value) return true
    if (!dateValue) return false
    const date = dateValue.slice(0, 10)
    if (from.value && date < from.value) return false
    if (to.value && date > to.value) return false
    return true
  }

  return { from, to, inRange }
}
