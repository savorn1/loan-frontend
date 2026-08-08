import type {
  AuthResponse,
  ChangePasswordRequest,
  LoginRequest,
  RegisterRequest,
  UserProfileResponse
} from '~/features/auth/types'
import type { Role } from '~/shared/types'
import { unwrapApiResponse } from '~/shared/utils/apiResponse'

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
  const { apiBase } = useRuntimeConfig().public
  // Plain $fetch (no auth token attachment/refresh retry — that's useApi()'s job, and
  // useApi() depends on this store so it can't be used here) but still needs the same
  // ApiResponse envelope unwrapped.
  const authClient = $fetch.create({ baseURL: apiBase, onResponse: unwrapApiResponse })

  const token = useCookie<string | null>('auth_token', { default: () => null, sameSite: 'lax' })
  const refreshToken = useCookie<string | null>('auth_refresh_token', {
    default: () => null,
    sameSite: 'lax'
  })
  const username = useCookie<string | null>('auth_username', {
    default: () => null,
    sameSite: 'lax'
  })
  const role = useCookie<Role | null>('auth_role', { default: () => null, sameSite: 'lax' })
  const branchId = useCookie<number | null>('auth_branch_id', {
    default: () => null,
    sameSite: 'lax'
  })
  const branchName = useCookie<string | null>('auth_branch_name', {
    default: () => null,
    sameSite: 'lax'
  })
  const email = useCookie<string | null>('auth_email', { default: () => null, sameSite: 'lax' })
  const avatarUrl = useCookie<string | null>('auth_avatar_url', {
    default: () => null,
    sameSite: 'lax'
  })

  const isAuthenticated = computed(() => !!token.value)
  const isAdmin = computed(() => role.value === 'ADMIN')

  function applySession(res: AuthResponse) {
    token.value = res.accessToken
    refreshToken.value = res.refreshToken
    username.value = res.username
    role.value = res.role
    branchId.value = res.branchId ?? null
    branchName.value = res.branchName ?? null
  }

  async function login(payload: LoginRequest) {
    const res = await authClient<AuthResponse>('/api/auth/login', { method: 'POST', body: payload })
    applySession(res)
    return res
  }

  async function register(payload: RegisterRequest) {
    const res = await authClient<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: payload
    })
    applySession(res)
    return res
  }

  // Exchanges the stored refresh token for a new access + refresh token pair
  // (the old refresh token is rotated/invalidated server-side on use).
  async function refresh() {
    if (!refreshToken.value) {
      throw new Error('No refresh token available')
    }
    const res = await authClient<AuthResponse>('/api/auth/refresh', {
      method: 'POST',
      body: { refreshToken: refreshToken.value }
    })
    applySession(res)
    return res
  }

  async function changePassword(payload: ChangePasswordRequest) {
    await $fetch('/api/auth/change-password', {
      baseURL: apiBase,
      method: 'PUT',
      headers: { Authorization: `Bearer ${token.value}` },
      body: payload
    })
  }

  function applyProfile(profile: UserProfileResponse) {
    email.value = profile.email
    avatarUrl.value = profile.avatarUrl
  }

  // Populates email/avatarUrl (not carried in the login response/JWT) so the
  // AppBar can show the real avatar without every page having to fetch it.
  async function fetchProfile() {
    if (!token.value) return
    const profile = await $fetch<UserProfileResponse>('/api/auth/me', {
      baseURL: apiBase,
      headers: { Authorization: `Bearer ${token.value}` },
      onResponse: unwrapApiResponse
    })
    applyProfile(profile)
    return profile
  }

  async function logout() {
    const pendingRefreshToken = refreshToken.value
    token.value = null
    refreshToken.value = null
    username.value = null
    role.value = null
    branchId.value = null
    branchName.value = null
    email.value = null
    avatarUrl.value = null
    if (pendingRefreshToken) {
      // Best-effort server-side revocation — the client-side session is already
      // cleared above regardless of whether this call succeeds.
      await $fetch('/api/auth/logout', {
        baseURL: apiBase,
        method: 'POST',
        body: { refreshToken: pendingRefreshToken }
      }).catch(() => {})
    }
  }

  return {
    token,
    username,
    role,
    branchId,
    branchName,
    email,
    avatarUrl,
    isAuthenticated,
    isAdmin,
    login,
    register,
    refresh,
    changePassword,
    applyProfile,
    fetchProfile,
    logout
  }
})
