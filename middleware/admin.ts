// Named middleware for pages that are entirely admin-only. Apply with
// `definePageMeta({ middleware: 'admin' })`. Most admin actions in this app
// are just conditionally-rendered buttons, not whole pages, so this is used
// sparingly.
export default defineNuxtRouteMiddleware(() => {
  const { isAdmin } = storeToRefs(useAuth())
  if (!isAdmin.value) {
    return navigateTo('/')
  }
})
