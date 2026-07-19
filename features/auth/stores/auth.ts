import type { AuthResponse, ChangePasswordRequest, LoginRequest, RegisterRequest } from '~/features/auth/types'
import type { Role } from '~/shared/types'

// Auth state persisted in cookies (SSR-safe, survives reloads). The access token is
// short-lived (24h per auth-service `jwt.expiration`); the refresh token (7d, single-use,
// revocable server-side) lets useApi() silently mint a new access token instead of forcing
// a full re-login on every expiry. auth-service is the sole issuer/validator source of
// truth — the gateway's AuthenticationFilter re-verifies the access token on every request.
//
// Kept as a Pinia store (rather than a plain composable) so auth state is inspectable in
// Pinia devtools and any future feature can read/react to it via storeToRefs() without
// re-deriving it. The cookies remain the actual persistence layer — Pinia just wraps them.
export const useAuth = defineStore('auth', () => {
  const token = useCookie<string | null>('auth_token', { default: () => null, sameSite: 'lax' })
  const refreshToken = useCookie<string | null>('auth_refresh_token', { default: () => null, sameSite: 'lax' })
  const username = useCookie<string | null>('auth_username', { default: () => null, sameSite: 'lax' })
  const role = useCookie<Role | null>('auth_role', { default: () => null, sameSite: 'lax' })

  const isAuthenticated = computed(() => !!token.value)
  const isAdmin = computed(() => role.value === 'ADMIN')

  function applySession(res: AuthResponse) {
    token.value = res.accessToken
    refreshToken.value = res.refreshToken
    username.value = res.username
    role.value = res.role
  }

  async function login(payload: LoginRequest) {
    const res = await $fetch<AuthResponse>('/api/auth/login', { method: 'POST', body: payload })
    applySession(res)
    return res
  }

  async function register(payload: RegisterRequest) {
    const res = await $fetch<AuthResponse>('/api/auth/register', { method: 'POST', body: payload })
    applySession(res)
    return res
  }

  // Exchanges the stored refresh token for a new access + refresh token pair
  // (the old refresh token is rotated/invalidated server-side on use).
  async function refresh() {
    if (!refreshToken.value) {
      throw new Error('No refresh token available')
    }
    const res = await $fetch<AuthResponse>('/api/auth/refresh', {
      method: 'POST',
      body: { refreshToken: refreshToken.value }
    })
    applySession(res)
    return res
  }

  async function changePassword(payload: ChangePasswordRequest) {
    await $fetch('/api/auth/change-password', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token.value}` },
      body: payload
    })
  }

  async function logout() {
    const pendingRefreshToken = refreshToken.value
    token.value = null
    refreshToken.value = null
    username.value = null
    role.value = null
    if (pendingRefreshToken) {
      // Best-effort server-side revocation — the client-side session is already
      // cleared above regardless of whether this call succeeds.
      await $fetch('/api/auth/logout', {
        method: 'POST',
        body: { refreshToken: pendingRefreshToken }
      }).catch(() => {})
    }
  }

  return { token, username, role, isAuthenticated, isAdmin, login, register, refresh, changePassword, logout }
})
