// Wraps an async factory so concurrent callers share a single in-flight call instead
// of each triggering their own — e.g. the auth store's refreshOnce() dedupes concurrent
// token refreshes so two useApi() instances hitting a 401 around the same time (the
// AppBar's notification poll and a page's own data fetch, say) don't each rotate the
// single-use refresh token and race each other into an unwanted logout.
export function dedupeAsync<T>(fn: () => Promise<T>): () => Promise<T> {
  let inFlight: Promise<T> | null = null
  return () => {
    inFlight ??= fn().finally(() => {
      inFlight = null
    })
    return inFlight
  }
}
