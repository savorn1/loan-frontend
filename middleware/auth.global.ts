// Global route guard: everything except /login and /register requires a
// session. Runs on both server (SSR) and client navigations.
const PUBLIC_PATHS = ['/login', '/register']

export default defineNuxtRouteMiddleware((to) => {
  const { isAuthenticated } = storeToRefs(useAuth())

  if (!isAuthenticated.value && !PUBLIC_PATHS.includes(to.path)) {
    return navigateTo('/login')
  }
  if (isAuthenticated.value && PUBLIC_PATHS.includes(to.path)) {
    return navigateTo('/')
  }
})
