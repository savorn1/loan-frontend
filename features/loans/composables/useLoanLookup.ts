import type { LoanResponse } from '~/features/loans/types'
import type { PageResponse } from '~/shared/types'

// Shared by any page that needs to label a bare loanId with its human-readable loanNo
// (payments, collections) — those list/workqueue endpoints only return the numeric
// loan id, so the loan list has to be fetched separately and mapped by id. `key` scopes
// the useAsyncData cache per caller (Nuxt dedupes by key, not by call site).
export async function useLoanLookup(key: string) {
  const api = useApi()
  const { data: loansRaw } = await useAsyncData(key, () =>
    api<PageResponse<LoanResponse>>('/loans', { query: { size: 1000 } })
  )

  const loans = computed(() => loansRaw.value?.content ?? [])
  const loanNoById = computed(() => new Map(loans.value.map((l) => [l.id, l.loanNo])))

  function loanLabel(loanId: number): string {
    return loanNoById.value.get(loanId) || `#${loanId}`
  }

  return { loans, loanNoById, loanLabel }
}
