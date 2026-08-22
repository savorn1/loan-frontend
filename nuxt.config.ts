const apiBase = process.env.NUXT_API_BASE || 'http://localhost:8080'
const isDev = process.env.NODE_ENV !== 'production'

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',

  // devtools: {
  //   enabled: true,

  //   // timeline: {
  //   //   enabled: true
  //   // }
  // },
  devServer: {
    port: Number(process.env.NUXT_PORT) || 3004
  },

  modules: ['@nuxt/ui', '@pinia/nuxt', '@nuxt/eslint', '@nuxtjs/i18n'],

  i18n: {
    locales: [
      {
        code: 'en',
        name: 'English',
        files: [
          'en/common.json',
          'en/accounting.json',
          'en/loan-config.json',
          'en/customers.json',
          'en/groups.json',
          'en/group-loan-applications.json',
          'en/loans-a.json',
          'en/loans-b.json',
          'en/payments.json',
          'en/collections.json',
          'en/admin.json'
        ]
      },
      {
        code: 'km',
        name: 'ខ្មែរ',
        files: [
          'km/common.json',
          'km/accounting.json',
          'km/loan-config.json',
          'km/customers.json',
          'km/groups.json',
          'km/group-loan-applications.json',
          'km/loans-a.json',
          'km/loans-b.json',
          'km/payments.json',
          'km/collections.json',
          'km/admin.json'
        ]
      }
    ],
    defaultLocale: 'en',
    strategy: 'no_prefix',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_locale'
    }
  },

  ui: {
    safelistColors: ['teal', 'green', 'orange', 'red', 'pink']
  },

  ssr: true,
  css: ['~/assets/css/main.css'],

  app: {
    head: {
      title: 'Loan Management System',
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }]
    },
    pageTransition: { name: 'page', mode: 'out-in' }
  },

  components: [
    { path: '~/components', pathPrefix: false },
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
      apiBase: isDev ? apiBase : '/api'
    }
  },

  routeRules: isDev
    ? {}
    : {
        '/api/auth/**': { proxy: `${apiBase}/api/auth/**` },
        '/api/branches/**': { proxy: `${apiBase}/api/branches/**` },
        '/api/customers/**': { proxy: `${apiBase}/api/customers/**` },
        '/api/groups/**': { proxy: `${apiBase}/api/groups/**` },
        '/api/group-loan-applications/**': { proxy: `${apiBase}/api/group-loan-applications/**` },
        '/api/loans/**': { proxy: `${apiBase}/api/loans/**` },
        '/api/loan-products/**': { proxy: `${apiBase}/api/loan-products/**` },
        '/api/interest-schemes/**': { proxy: `${apiBase}/api/interest-schemes/**` },
        '/api/fee-schemes/**': { proxy: `${apiBase}/api/fee-schemes/**` },
        '/api/term-templates/**': { proxy: `${apiBase}/api/term-templates/**` },
        '/api/rule-templates/**': { proxy: `${apiBase}/api/rule-templates/**` },
        '/api/document-templates/**': { proxy: `${apiBase}/api/document-templates/**` },
        '/api/payments/**': { proxy: `${apiBase}/api/payments/**` },
        '/api/notifications/**': { proxy: `${apiBase}/api/notifications/**` },
        '/api/gl-accounts/**': { proxy: `${apiBase}/api/gl-accounts/**` },
        '/api/journal-templates/**': { proxy: `${apiBase}/api/journal-templates/**` },
        '/api/accounting-schemes/**': { proxy: `${apiBase}/api/accounting-schemes/**` },
        '/api/financial-periods/**': { proxy: `${apiBase}/api/financial-periods/**` },
        '/api/journal-entries/**': { proxy: `${apiBase}/api/journal-entries/**` },
        '/api/trial-balance/**': { proxy: `${apiBase}/api/trial-balance/**` },
        '/api/reports/**': { proxy: `${apiBase}/api/reports/**` },
        '/api/budgets/**': { proxy: `${apiBase}/api/budgets/**` }
      },

  typescript: {
    strict: true
  },

  // useApi()'s 401-retry flow (refresh then redirect to /login on failure) calls
  // composables like navigateTo()/useCookie() after crossing several `await`
  // boundaries; without this, Nuxt loses track of the current app instance at that
  // point and throws instead of redirecting, so an expired session renders a raw
  // error page instead of the login screen.
  experimental: {
    asyncContext: true
  },

  devtools: {
    timeline: {
      enabled: true
    }
  }
})
