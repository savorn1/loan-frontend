<template>
  <div v-if="loan">
    <UButton to="/loans" variant="link" icon="i-heroicons-arrow-left" size="xs" class="mb-1 px-0">
      {{ t('loans.shell.backToLoans') }}
    </UButton>
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <div>
          <h1 class="text-xl font-bold">{{ t('loans.shell.loanTitle', { id: loan.id }) }}</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ loan.loanNo }}</p>
        </div>
        <StatusBadge :status="loan.status" />
      </div>
      <div v-if="isAdmin" class="flex gap-2">
        <UButton v-if="loan.status === 'PENDING'" color="green" @click="confirmAction = 'approve'">
          {{ t('loans.shell.actions.approve') }}
        </UButton>
        <UButton
          v-if="loan.status === 'PENDING'"
          color="red"
          variant="soft"
          @click="confirmAction = 'reject'"
        >
          {{ t('loans.shell.actions.reject') }}
        </UButton>
        <UButton
          v-if="loan.status === 'APPROVED'"
          color="primary"
          @click="confirmAction = 'disburse'"
        >
          {{ t('loans.shell.actions.disburse') }}
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
                'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-400/10 border-l-2 border-primary-500 dark:border-primary-400 before:hidden',
              inactive:
                'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800',
              icon: {
                base: 'w-4.5 h-4.5 shrink-0',
                active: 'text-primary-600 dark:text-primary-400',
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
  <div v-else-if="error" class="py-8">
    <ErrorState :title="t('common.errorState.title')" :description="apiErrorMessage(error)">
      <template #action>
        <UButton
          size="sm"
          variant="soft"
          icon="i-heroicons-arrow-path"
          :loading="pending"
          @click="refresh()"
        >
          {{ t('common.errorState.retry') }}
        </UButton>
      </template>
    </ErrorState>
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

const { t } = useI18n()
const route = useRoute()
const api = useApi()
const toast = useToast()
const { isAdmin } = storeToRefs(useAuth())

const loanId = route.params.id as string

const {
  data: loan,
  error,
  pending,
  refresh
} = await useAsyncData(`loan-${loanId}`, () => api<LoanResponse>(`/loans/${loanId}`))

const tabGroups = computed(() => [
  {
    title: t('loans.shell.tabGroups.overview'),
    links: [
      {
        label: t('loans.shell.tabs.overview'),
        to: `/loans/${loanId}`,
        exact: true,
        icon: 'i-heroicons-squares-2x2'
      },
      {
        label: t('loans.shell.tabs.contract'),
        to: `/loans/${loanId}/contract`,
        icon: 'i-heroicons-document-text'
      },
      {
        label: t('loans.shell.tabs.schedule'),
        to: `/loans/${loanId}/schedule`,
        icon: 'i-heroicons-calendar-days'
      }
    ]
  },
  {
    title: t('loans.shell.tabGroups.money'),
    links: [
      {
        label: t('loans.shell.tabs.payments'),
        to: `/loans/${loanId}/payments`,
        icon: 'i-heroicons-banknotes'
      },
      {
        label: t('loans.shell.tabs.transactions'),
        to: `/loans/${loanId}/transactions`,
        icon: 'i-heroicons-arrows-right-left'
      },
      {
        label: t('loans.shell.tabs.disbursements'),
        to: `/loans/${loanId}/disbursements`,
        icon: 'i-heroicons-arrow-up-circle'
      },
      {
        label: t('loans.shell.tabs.interest'),
        to: `/loans/${loanId}/interest`,
        icon: 'i-heroicons-percent-badge'
      },
      {
        label: t('loans.shell.tabs.fees'),
        to: `/loans/${loanId}/fees`,
        icon: 'i-heroicons-receipt-percent'
      },
      {
        label: t('loans.shell.tabs.penalties'),
        to: `/loans/${loanId}/penalties`,
        icon: 'i-heroicons-exclamation-triangle'
      },
      {
        label: t('loans.shell.tabs.adjustments'),
        to: `/loans/${loanId}/adjustments`,
        icon: 'i-heroicons-adjustments-horizontal'
      },
      {
        label: t('loans.shell.tabs.settlement'),
        to: `/loans/${loanId}/settlement`,
        icon: 'i-heroicons-check-badge'
      },
      {
        label: t('loans.shell.tabs.writeoff'),
        to: `/loans/${loanId}/writeoff`,
        icon: 'i-heroicons-trash'
      }
    ]
  },
  {
    title: t('loans.shell.tabGroups.related'),
    links: [
      {
        label: t('loans.shell.tabs.collateral'),
        to: `/loans/${loanId}/collaterals`,
        icon: 'i-heroicons-shield-check'
      },
      {
        label: t('loans.shell.tabs.guarantors'),
        to: `/loans/${loanId}/guarantors`,
        icon: 'i-heroicons-user-group'
      }
    ]
  },
  {
    title: t('loans.shell.tabGroups.history'),
    links: [
      {
        label: t('loans.shell.tabs.statusHistory'),
        to: `/loans/${loanId}/status-history`,
        icon: 'i-heroicons-clock'
      },
      {
        label: t('loans.shell.tabs.restructures'),
        to: `/loans/${loanId}/restructures`,
        icon: 'i-heroicons-arrow-path'
      },
      {
        label: t('loans.shell.tabs.refinances'),
        to: `/loans/${loanId}/refinances`,
        icon: 'i-heroicons-arrow-path-rounded-square'
      },
      {
        label: t('loans.shell.tabs.notes'),
        to: `/loans/${loanId}/notes`,
        icon: 'i-heroicons-pencil-square'
      },
      {
        label: t('loans.shell.tabs.documents'),
        to: `/loans/${loanId}/documents`,
        icon: 'i-heroicons-folder'
      }
    ]
  }
])

const actionLoading = ref<string | null>(null)

type LoanAction = 'approve' | 'reject' | 'disburse'
const confirmAction = ref<LoanAction | null>(null)

const CONFIRM_META = computed<
  Record<
    LoanAction,
    { title: string; description: string; confirmLabel: string; color: 'green' | 'red' | 'primary' }
  >
>(() => ({
  approve: {
    title: t('loans.shell.confirm.approve.title'),
    description: t('loans.shell.confirm.approve.description'),
    confirmLabel: t('loans.shell.confirm.approve.confirmLabel'),
    color: 'green'
  },
  reject: {
    title: t('loans.shell.confirm.reject.title'),
    description: t('loans.shell.confirm.reject.description'),
    confirmLabel: t('loans.shell.confirm.reject.confirmLabel'),
    color: 'red'
  },
  disburse: {
    title: t('loans.shell.confirm.disburse.title'),
    description: t('loans.shell.confirm.disburse.description'),
    confirmLabel: t('loans.shell.confirm.disburse.confirmLabel'),
    color: 'primary'
  }
}))

const confirmMeta = computed(() => CONFIRM_META.value[confirmAction.value ?? 'approve'])

const ACTION_TOAST: Record<LoanAction, string> = {
  approve: 'loans.shell.toast.approved',
  reject: 'loans.shell.toast.rejected',
  disburse: 'loans.shell.toast.disbursed'
}

async function doAction() {
  const action = confirmAction.value
  if (!action) return
  actionLoading.value = action
  try {
    await api(`/loans/${loanId}/${action}`, { method: 'PUT' })
    toast.add({ title: t(ACTION_TOAST[action]), color: 'green' })
    confirmAction.value = null
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    actionLoading.value = null
  }
}
</script>
