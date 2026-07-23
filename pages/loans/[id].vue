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
      <div class="flex gap-2" v-if="isAdmin">
        <UButton v-if="loan.status === 'PENDING'" color="green" @click="confirmAction = 'approve'">
          Approve
        </UButton>
        <UButton v-if="loan.status === 'PENDING'" color="red" variant="soft" @click="confirmAction = 'reject'">
          Reject
        </UButton>
        <UButton v-if="loan.status === 'APPROVED'" color="primary" @click="confirmAction = 'disburse'">
          Disburse
        </UButton>
      </div>
    </div>

    <UHorizontalNavigation :links="tabs" class="border-b border-gray-200 dark:border-gray-800 mb-6" />

    <NuxtPage />

    <ConfirmModal
      :model-value="!!confirmAction"
      :title="confirmMeta.title"
      :description="confirmMeta.description"
      :confirm-label="confirmMeta.confirmLabel"
      :color="confirmMeta.color"
      :loading="!!actionLoading"
      @update:model-value="(v: boolean) => { if (!v) confirmAction = null }"
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

const { data: loan, refresh } = await useAsyncData(`loan-${loanId}`, () => api<LoanResponse>(`/loans/${loanId}`))

const tabs = computed(() => [
  { label: 'Overview', to: `/loans/${loanId}`, exact: true },
  { label: 'Status history', to: `/loans/${loanId}/status-history` },
  { label: 'Disbursements', to: `/loans/${loanId}/disbursements` },
  { label: 'Restructures', to: `/loans/${loanId}/restructures` },
  { label: 'Refinances', to: `/loans/${loanId}/refinances` },
  { label: 'Penalties', to: `/loans/${loanId}/penalties` },
  { label: 'Interest', to: `/loans/${loanId}/interest` },
  { label: 'Adjustments', to: `/loans/${loanId}/adjustments` },
  { label: 'Settlement', to: `/loans/${loanId}/settlement` },
  { label: 'Write-off', to: `/loans/${loanId}/writeoff` },
  { label: 'Notes', to: `/loans/${loanId}/notes` },
  { label: 'Documents', to: `/loans/${loanId}/documents` }
])

const actionLoading = ref<string | null>(null)

type LoanAction = 'approve' | 'reject' | 'disburse'
const confirmAction = ref<LoanAction | null>(null)

const CONFIRM_META: Record<LoanAction, { title: string; description: string; confirmLabel: string; color: 'green' | 'red' | 'primary' }> = {
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
    description: 'Funds are marked as released, the amortization schedule is generated, and the loan becomes ACTIVE. This cannot be undone.',
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
