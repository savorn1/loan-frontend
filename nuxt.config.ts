// Nuxt config: Nuxt UI (Tailwind-based components) + a same-origin proxy to the
// api-gateway so the browser never makes a cross-origin request (no CORS setup
// needed on the backend). NUXT_API_BASE overrides the gateway URL at runtime.
const apiBase = process.env.NUXT_API_BASE || 'http://localhost:8080'

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  devServer: {
    port: Number(process.env.NUXT_PORT) || 3000
  },
  modules: ['@nuxt/ui', '@pinia/nuxt'],
  // Colors passed to UBadge/UProgress/UButton dynamically (computed refs in
  // StatusBadge, ConfirmModal callers, etc.) aren't visible to Nuxt UI's
  // static safelist scan — list them so their Tailwind classes are generated.
  ui: {
    safelistColors: ['teal', 'green', 'orange', 'red']
  },
  ssr: true,
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      title: 'Loan Management System'
    },
    // Soft fade+rise between routes (classes live in assets/css/main.css).
    pageTransition: { name: 'page', mode: 'out-in' }
  },
  // Feature-folder layout: each domain (features/<name>/) owns its components,
  // composables, utils and types; only truly cross-cutting code lives in shared/.
  // pages/, layouts/ and middleware/ stay at the root — Nuxt's file-based
  // routing requires those conventional locations.
  components: [
    { path: '~/shared/components', pathPrefix: false },
    { path: '~/features', pattern: '*/components/**/*.vue', pathPrefix: false }
  ],
  imports: {
    dirs: [
      'shared/composables',
      'shared/utils',
      'features/*/composables',
      'features/*/utils',
      'features/*/stores'
    ]
  },
  runtimeConfig: {
    public: {
      apiBase: '/api' // client always calls same-origin /api/*, Nitro proxies it below
    }
  },
  routeRules: {
    // Forward only the actual backend resource paths to the Spring Cloud Gateway.
    // Scoped (rather than a blanket '/api/**') so it never swallows Nuxt's own
    // internal routes under /api/**, e.g. Nuxt Icon's /api/_nuxt_icon/** endpoint.
    '/api/auth/**': { proxy: `${apiBase}/api/auth/**` },
    '/api/customers/**': { proxy: `${apiBase}/api/customers/**` },
    '/api/loans/**': { proxy: `${apiBase}/api/loans/**` },
    '/api/payments/**': { proxy: `${apiBase}/api/payments/**` }
  },
  typescript: {
    strict: true
  }
})
