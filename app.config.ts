// Nuxt UI theme tokens — every UButton/UBadge/UCard/UInput/etc. across the app
// pulls its Tailwind classes from here, so this is the one place that sets the
// app's visual identity instead of components hard-coding colors ad hoc.
//
// The rounded-full buttons + rounded-2xl cards give the whole app the same
// soft, friendly look the login screen introduced, without touching each page.
export default defineAppConfig({
  ui: {
    primary: 'emerald',
    gray: 'slate',
    card: {
      rounded: 'rounded-2xl',
      shadow: 'shadow-sm',
      ring: 'ring-1 ring-gray-200/70 dark:ring-gray-800'
    },
    button: {
      rounded: 'rounded-full',
      default: {
        size: 'sm'
      }
    },
    input: {
      rounded: 'rounded-lg'
    },
    badge: {
      rounded: 'rounded-full'
    },
    modal: {
      rounded: 'rounded-2xl'
    }
  }
})
