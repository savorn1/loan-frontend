// Nuxt UI theme tokens — every UButton/UBadge/UCard/UInput/etc. across the app
// pulls its Tailwind classes from here, so this is the one place that sets the
// app's visual identity instead of components hard-coding colors ad hoc.
export default defineAppConfig({
  ui: {
    primary: 'blue',
    gray: 'slate',
    card: {
      rounded: 'rounded-xl',
      shadow: 'shadow-sm'
    },
    button: {
      rounded: 'rounded-lg',
      default: {
        size: 'sm'
      }
    },
    badge: {
      rounded: 'rounded-md'
    }
  }
})
