<template>
  <div v-if="loan">
    <UButton to="/loans" variant="link" icon="i-heroicons-arrow-left" size="xs" class="mb-1 px-0">
      Back to loans
    </UButton>
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <h1 class="text-xl font-bold">Loan #{{ loan.id }}</h1>
        <StatusBadge :status="loan.status" />
      </div>
      <div v-if="isAdmin" class="flex gap-2">
        <UButton v-if="loan.status === 'PENDING'" color="green" @click="confirmAction = 'approve'">
          Approve
        </UButton>
        <UButton
          v-if="loan.status === 'PENDING'"
          color="red"
          variant="soft"
          @click="confirmAction = 'reject'"
        >
          Reject
        </UButton>
        <UButton
          v-if="loan.status === 'APPROVED'"
          color="primary"
          @click="confirmAction = 'disburse'"
        >
          Disburse
        </UButton>
      </div>
    </div>

    <div class="flex flex-col md:flex-row gap-6">
      <div class="md:w-56 shrink-0 space-y-4">
        <div v-for="group in tabGroups" :key="group.title">
          <p
            class="px-3 mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500"
          >
            {{ group.title }}
          </p>
          <UVerticalNavigation
            :links="group.links"
            :ui="{
              wrapper: 'space-y-0.5',
              base: 'group relative flex items-center gap-2.5 rounded-xl border-l-2 border-transparent px-3 py-2 text-sm font-medium transition-colors',
              padding: 'px-0 py-0',
              rounded: 'rounded-xl',
              active:
                'text-fuchsia-600 dark:text-fuchsia-400 bg-fuchsia-50 dark:bg-fuchsia-400/10 border-l-2 border-fuchsia-500 dark:border-fuchsia-400 before:hidden',
              inactive:
                'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800',
              icon: {
                base: 'w-4.5 h-4.5 shrink-0',
                active: 'text-fuchsia-600 dark:text-fuchsia-400',
                inactive:
                  'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'
              }
            }"
          />
        </div>
      </div>

      <div class="flex-1 min-w-0">
        <NuxtPage />
      </div>
    </div>

    <ConfirmModal
      :model-value="!!confirmAction"
      :title="confirmMeta.title"
      :description="confirmMeta.description"
      :confirm-label="confirmMeta.confirmLabel"
      :color="confirmMeta.color"
      :loading="!!actionLoading"
      @update:model-value="
        (v: boolean) => {
          if (!v) confirmAction = null
        }
      "
      @confirm="doAction"
    />
  </div>
  <div v-else class="flex justify-center py-16">
    <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-gray-400" />
  </div>
</template>

<script setup lang="ts">
// Tab shell shared by every /loans/:id/** page — renders the loan header
// (back link, status, admin lifecycle actions) once and hosts the tab body
// via <NuxtPage/>. Nuxt nests pages/loans/[id]/*.vue routes inside this file
// automatically because it shares the [id] param.
import type { LoanResponse } from '~/features/loans/types'

const route = useRoute()
const api = useApi()
const toast = useToast()
const { isAdmin } = storeToRefs(useAuth())

const loanId = route.params.id as string

const { data: loan, refresh } = await useAsyncData(`loan-${loanId}`, () =>
  api<LoanResponse>(`/loans/${loanId}`)
)

const tabGroups = computed(() => [
  {
    title: 'Overview',
    links: [
      { label: 'Overview', to: `/loans/${loanId}`, exact: true, icon: 'i-heroicons-squares-2x2' },
      { label: 'Contract', to: `/loans/${loanId}/contract`, icon: 'i-heroicons-document-text' },
      { label: 'Schedule', to: `/loans/${loanId}/schedule`, icon: 'i-heroicons-calendar-days' }
    ]
  },
  {
    title: 'Money',
    links: [
      { label: 'Payments', to: `/loans/${loanId}/payments`, icon: 'i-heroicons-banknotes' },
      {
        label: 'Transactions',
        to: `/loans/${loanId}/transactions`,
        icon: 'i-heroicons-arrows-right-left'
      },
      {
        label: 'Disbursements',
        to: `/loans/${loanId}/disbursements`,
        icon: 'i-heroicons-arrow-up-circle'
      },
      { label: 'Interest', to: `/loans/${loanId}/interest`, icon: 'i-heroicons-percent-badge' },
      { label: 'Fees', to: `/loans/${loanId}/fees`, icon: 'i-heroicons-receipt-percent' },
      {
        label: 'Penalties',
        to: `/loans/${loanId}/penalties`,
        icon: 'i-heroicons-exclamation-triangle'
      },
      {
        label: 'Adjustments',
        to: `/loans/${loanId}/adjustments`,
        icon: 'i-heroicons-adjustments-horizontal'
      },
      { label: 'Settlement', to: `/loans/${loanId}/settlement`, icon: 'i-heroicons-check-badge' },
      { label: 'Write-off', to: `/loans/${loanId}/writeoff`, icon: 'i-heroicons-trash' }
    ]
  },
  {
    title: 'Related',
    links: [
      { label: 'Collateral', to: `/loans/${loanId}/collaterals`, icon: 'i-heroicons-shield-check' },
      { label: 'Guarantors', to: `/loans/${loanId}/guarantors`, icon: 'i-heroicons-user-group' }
    ]
  },
  {
    title: 'History',
    links: [
      {
        label: 'Status history',
        to: `/loans/${loanId}/status-history`,
        icon: 'i-heroicons-clock'
      },
      { label: 'Restructures', to: `/loans/${loanId}/restructures`, icon: 'i-heroicons-arrow-path' },
      {
        label: 'Refinances',
        to: `/loans/${loanId}/refinances`,
        icon: 'i-heroicons-arrow-path-rounded-square'
      },
      { label: 'Notes', to: `/loans/${loanId}/notes`, icon: 'i-heroicons-pencil-square' },
      { label: 'Documents', to: `/loans/${loanId}/documents`, icon: 'i-heroicons-folder' }
    ]
  }
])

const actionLoading = ref<string | null>(null)

type LoanAction = 'approve' | 'reject' | 'disburse'
const confirmAction = ref<LoanAction | null>(null)

const CONFIRM_META: Record<
  LoanAction,
  { title: string; description: string; confirmLabel: string; color: 'green' | 'red' | 'primary' }
> = {
  approve: {
    title: 'Approve this loan?',
    description: 'The loan moves to APPROVED and becomes eligible for disbursement.',
    confirmLabel: 'Approve',
    color: 'green'
  },
  reject: {
    title: 'Reject this loan?',
    description: 'This is final — a rejected loan cannot be approved later.',
    confirmLabel: 'Reject',
    color: 'red'
  },
  disburse: {
    title: 'Disburse this loan?',
    description:
      'Funds are marked as released, the amortization schedule is generated, and the loan becomes ACTIVE. This cannot be undone.',
    confirmLabel: 'Disburse',
    color: 'primary'
  }
}

const confirmMeta = computed(() => CONFIRM_META[confirmAction.value ?? 'approve'])

async function doAction() {
  const action = confirmAction.value
  if (!action) return
  actionLoading.value = action
  try {
    await api(`/loans/${loanId}/${action}`, { method: 'PUT' })
    toast.add({ title: `Loan ${action}d`, color: 'green' })
    confirmAction.value = null
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    actionLoading.value = null
  }
}
</script>
