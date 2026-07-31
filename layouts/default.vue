<template>
  <div class="min-h-screen flex bg-gray-50 dark:bg-gray-950">
    <!-- Desktop sidebar -->
    <aside
      class="hidden lg:flex w-60 shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-col"
    >
      <SidebarContent
        :groups="groups"
        :username="username"
        :role="role"
        :is-admin="isAdmin"
        @change-password="showChangePassword = true"
        @logout="onLogout"
      />
    </aside>

    <!-- Mobile off-canvas nav -->
    <USlideover v-model="mobileNavOpen" side="left" :ui="{ width: 'max-w-xs' }">
      <div class="flex flex-col h-full bg-white dark:bg-gray-900">
        <SidebarContent
          :groups="groups"
          :username="username"
          :role="role"
          :is-admin="isAdmin"
          @change-password="showChangePassword = true; mobileNavOpen = false"
          @logout="onLogout"
        />
      </div>
    </USlideover>

    <div class="flex-1 min-w-0 flex flex-col">
      <!-- Mobile top bar -->
      <header
        class="lg:hidden h-14 shrink-0 flex items-center gap-3 px-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-20"
      >
        <UButton
          icon="i-heroicons-bars-3"
          color="gray"
          variant="ghost"
          square
          :aria-label="'Open menu'"
          @click="mobileNavOpen = true"
        />
        <span
          class="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-teal-600 text-white shrink-0 shadow-sm"
        >
          <UIcon name="i-heroicons-banknotes" class="w-4 h-4" />
        </span>
        <span class="font-bold text-gray-900 dark:text-white tracking-tight">LMS</span>
      </header>

      <main class="flex-1 min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <slot />
      </main>
    </div>

    <ChangePasswordModal v-model="showChangePassword" />
  </div>
</template>

<script setup lang="ts">
const auth = useAuth()
const { username, role, isAdmin } = storeToRefs(auth)
const { logout } = auth
const { t } = useI18n()

const groups = computed(() => [
  {
    links: [
      { label: t('nav.customers'), to: '/customers', icon: 'i-heroicons-users' },
      { label: t('nav.applications'), to: '/applications', icon: 'i-heroicons-document-text' },
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
          links: [
            { label: t('nav.users'), to: '/users', icon: 'i-heroicons-user-group' },
            { label: t('nav.roles'), to: '/roles', icon: 'i-heroicons-identification' },
            { label: t('nav.permissions'), to: '/permissions', icon: 'i-heroicons-key' }
          ]
        }
      ]
    : []),
  {
    title: t('nav.payment'),
    icon: 'i-heroicons-credit-card',
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

// Close the mobile drawer automatically whenever a nav link is followed.
const route = useRoute()
watch(
  () => route.fullPath,
  () => {
    mobileNavOpen.value = false
  }
)

async function onLogout() {
  await logout()
  navigateTo('/login')
}
</script>
