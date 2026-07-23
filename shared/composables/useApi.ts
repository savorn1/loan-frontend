import type { ApiErrorBody } from '~/shared/types'
import { unwrapApiResponse } from '~/shared/utils/apiResponse'

// Thin wrapper around $fetch: attaches the Bearer token to every request. On a 401
// (expired/invalid access token — mirrors what the gateway's AuthenticationFilter
// rejects) it silently exchanges the refresh token for a new access token and
// retries the request once; only if that also fails does it bounce to /login.
// All backend calls should go through this instead of raw $fetch.
export function useApi() {
  const auth = useAuth()
  const { token } = storeToRefs(auth)
  const { refresh, logout } = auth

  const { apiBase } = useRuntimeConfig().public

  const client = $fetch.create({
    baseURL: apiBase,
    onRequest({ options }) {
      if (token.value) {
        const headers = new Headers(options.headers as HeadersInit)
        headers.set('Authorization', `Bearer ${token.value}`)
        options.headers = headers
      }
    },
    onResponse: unwrapApiResponse
  })

  // Dedupes concurrent 401s triggered by multiple calls through this same
  // `api` instance (e.g. a page firing several requests at once) so they
  // don't each rotate the refresh token and race each other.
  let refreshPromise: Promise<unknown> | null = null

  // `any` here matches ofetch's own loosely-typed FetchOptions second parameter —
  // callers still get full inference on the return type via request<T>(...).
  return async function request<T>(url: string, opts?: any): Promise<T> {
    // Feature call sites pass bare resource paths (e.g. '/loan-products'), not '/api/...' —
    // that convention predates the dev-mode switch to calling the gateway directly (apiBase
    // is now the raw gateway origin in dev, not '/api'), so the '/api' prefix has to be added
    // here instead of relying on baseURL to supply it. Safe in prod too: ufo's withBase()
    // no-ops when the path already starts with the base.
    const apiUrl = `/api${url}`
    try {
      return await client<T>(apiUrl, opts)
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status !== 401) {
        throw err
      }
      try {
        refreshPromise ??= refresh().finally(() => { refreshPromise = null })
        await refreshPromise
        return await client<T>(apiUrl, opts)
      } catch {
        await logout()
        if (import.meta.client) navigateTo('/login')
        throw err
      }
    }
  }
}

// Pulls the `message` (and optional field `errors`) out of the standard
// GlobalExceptionHandler error body so UI code can show it directly.
export function apiErrorMessage(err: unknown): string {
  const data = (err as { data?: ApiErrorBody })?.data
  if (data?.errors) {
    return Object.values(data.errors).join(', ')
  }
  return data?.message ?? 'Something went wrong. Please try again.'
}
