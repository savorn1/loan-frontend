// Global route guard: everything except /login requires a session. Runs on
// both server (SSR) and client navigations. No self-signup — new users are
// created by an admin (pages/users), not through a public route.
const PUBLIC_PATHS = ['/login']

export default defineNuxtRouteMiddleware((to) => {
  const { isAuthenticated } = storeToRefs(useAuth())

  if (!isAuthenticated.value && !PUBLIC_PATHS.includes(to.path)) {
    return navigateTo('/login')
  }
  if (isAuthenticated.value && PUBLIC_PATHS.includes(to.path)) {
    return navigateTo('/')
  }
})
