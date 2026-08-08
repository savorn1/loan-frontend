<template>
  <div class="min-h-screen flex bg-gray-50 dark:bg-gray-950">
    <!-- Desktop sidebar -->
    <aside
      class="hidden lg:flex sticky top-0 h-screen shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-col transition-all duration-200"
      :class="sidebarCollapsed ? 'w-16' : 'w-60'"
    >
      <SidebarContent v-model:collapsed="sidebarCollapsed" :groups="groups" />
    </aside>

    <!-- Mobile off-canvas nav -->
    <USlideover v-model="mobileNavOpen" side="left" :ui="{ width: 'max-w-xs' }">
      <div class="flex flex-col h-full bg-white dark:bg-gray-900">
        <SidebarContent :groups="groups" />
      </div>
    </USlideover>

    <div class="flex-1 min-w-0 flex flex-col">
      <AppBar
        :username="username"
        :role="role"
        :is-admin="isAdmin"
        :avatar-url="avatarUrl"
        @open-menu="mobileNavOpen = true"
        @open-search="commandPaletteOpen = true"
        @logout="onLogout"
      />

      <main class="flex-1 min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <slot />
      </main>
    </div>

    <ChangePasswordModal v-model="showChangePassword" />
    <CommandPalette
      v-model="commandPaletteOpen"
      :groups="groups"
      @change-password="showChangePassword = true"
      @logout="onLogout"
    />
  </div>
</template>

<script setup lang="ts">
const auth = useAuth()
const { username, role, isAdmin, avatarUrl } = storeToRefs(auth)
const { logout, fetchProfile } = auth
const { t } = useI18n()

// Populates email/avatarUrl once per session load — not carried in the login
// response/JWT, so the AppBar wouldn't otherwise know about them until the
// profile page itself was visited.
onMounted(() => {
  fetchProfile().catch(() => {})
})

const groups = computed(() => [
  {
    links: [
      { label: t('nav.customers'), to: '/customers', icon: 'i-heroicons-users' },
      { label: t('nav.groups'), to: '/groups', icon: 'i-heroicons-rectangle-group' },
      {
        label: t('nav.groupLoanApplications'),
        to: '/group-loan-applications',
        icon: 'i-heroicons-clipboard-document-check'
      },
      { label: t('nav.applications'), to: '/applications', icon: 'i-heroicons-document-text' },
      {
        label: t('nav.loanCalculator'),
        to: '/loan-calculator',
        icon: 'i-heroicons-calculator'
      },
      { label: t('nav.loans'), to: '/loans', icon: 'i-heroicons-banknotes' },
      { label: t('nav.reports'), to: '/reports', icon: 'i-heroicons-chart-bar-square' },
      { label: t('nav.notifications'), to: '/notifications', icon: 'i-heroicons-bell' }
    ]
  },
  ...(isAdmin.value
    ? [
        {
          title: t('nav.userManagement'),
          icon: 'i-heroicons-shield-check',
          color: 'pink',
          links: [
            { label: t('nav.users'), to: '/users', icon: 'i-heroicons-user-group' },
            { label: t('nav.roles'), to: '/roles', icon: 'i-heroicons-identification' },
            { label: t('nav.permissions'), to: '/permissions', icon: 'i-heroicons-key' },
            { label: t('nav.branches'), to: '/branches', icon: 'i-heroicons-building-office-2' }
          ]
        }
      ]
    : []),
  {
    title: t('nav.payment'),
    icon: 'i-heroicons-credit-card',
    color: 'blue',
    links: [
      { label: t('nav.payments'), to: '/payments', icon: 'i-heroicons-credit-card' },
      { label: t('nav.collections'), to: '/collections', icon: 'i-heroicons-phone' },
      {
        label: t('nav.transactions'),
        to: '/payment-transactions',
        icon: 'i-heroicons-arrows-right-left'
      },
      { label: t('nav.paymentMethods'), to: '/payment-methods', icon: 'i-heroicons-wallet' },
      { label: t('nav.paymentChannels'), to: '/payment-channels', icon: 'i-heroicons-signal' },
      { label: t('nav.paymentGateways'), to: '/payment-gateways', icon: 'i-heroicons-globe-alt' }
    ]
  },
  {
    title: t('nav.accounting'),
    icon: 'i-heroicons-calculator',
    color: 'orange',
    links: [
      { label: t('nav.journalEntries'), to: '/journal-entries', icon: 'i-heroicons-book-open' },
      { label: t('nav.generalLedger'), to: '/general-ledger', icon: 'i-heroicons-book-open' },
      { label: t('nav.trialBalance'), to: '/trial-balance', icon: 'i-heroicons-scale' },
      { label: t('nav.chartOfAccounts'), to: '/gl-accounts', icon: 'i-heroicons-list-bullet' },
      {
        label: t('nav.journalTemplates'),
        to: '/journal-templates',
        icon: 'i-heroicons-document-text'
      },
      { label: t('nav.accountingSchemes'), to: '/accounting-schemes', icon: 'i-heroicons-link' },
      {
        label: t('nav.financialPeriods'),
        to: '/financial-periods',
        icon: 'i-heroicons-calendar-days'
      }
    ]
  },
  {
    title: t('nav.loanConfiguration'),
    icon: 'i-heroicons-adjustments-horizontal',
    color: 'indigo',
    links: [
      {
        label: t('nav.loanProducts'),
        to: '/loan-products',
        icon: 'i-heroicons-clipboard-document-list'
      },
      {
        label: t('nav.productInterestSchemes'),
        to: '/loan-product-interest-schemes',
        icon: 'i-heroicons-chart-bar'
      },
      {
        label: t('nav.productFeeSchemes'),
        to: '/loan-product-fee-schemes',
        icon: 'i-heroicons-banknotes'
      },
      {
        label: t('nav.productTerms'),
        to: '/loan-product-terms',
        icon: 'i-heroicons-calendar-days'
      },
      {
        label: t('nav.productRules'),
        to: '/loan-product-rules',
        icon: 'i-heroicons-clipboard-document-check'
      },
      {
        label: t('nav.productDocuments'),
        to: '/loan-product-documents',
        icon: 'i-heroicons-folder'
      },
      {
        label: t('nav.interestSchemes'),
        to: '/interest-schemes',
        icon: 'i-heroicons-chart-bar-square'
      },
      { label: t('nav.feeSchemes'), to: '/fee-schemes', icon: 'i-heroicons-currency-dollar' },
      { label: t('nav.termTemplates'), to: '/term-templates', icon: 'i-heroicons-clock' },
      {
        label: t('nav.ruleTemplates'),
        to: '/rule-templates',
        icon: 'i-heroicons-adjustments-horizontal'
      },
      {
        label: t('nav.documentTemplates'),
        to: '/document-templates',
        icon: 'i-heroicons-document-duplicate'
      }
    ]
  }
])

const showChangePassword = ref(false)
const mobileNavOpen = ref(false)
const commandPaletteOpen = ref(false)
const sidebarCollapsed = useCookie<boolean>('sidebar_collapsed', {
  default: () => false,
  sameSite: 'lax'
})

// Close the mobile drawer automatically whenever a nav link is followed.
const route = useRoute()
watch(
  () => route.fullPath,
  () => {
    mobileNavOpen.value = false
  }
)

// Global Cmd/Ctrl+K to open the command palette from anywhere in the app.
function onKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    commandPaletteOpen.value = true
  }
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

async function onLogout() {
  await logout()
  navigateTo('/login')
}
</script>
