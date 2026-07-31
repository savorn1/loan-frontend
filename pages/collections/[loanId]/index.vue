<template>
  <div v-if="loan" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <UCard>
      <template #header>
        <span class="font-semibold">{{ t('collections.overview.loanCard.title') }}</span>
      </template>
      <dl class="grid grid-cols-2 gap-y-3 text-sm">
        <dt class="text-gray-500">{{ t('collections.overview.loanCard.customer') }}</dt>
        <dd>
          <NuxtLink :to="`/customers/${loan.customerId}`" class="text-primary-500">{{
            loan.customerName
          }}</NuxtLink>
        </dd>
        <dt class="text-gray-500">{{ t('collections.overview.loanCard.principal') }}</dt>
        <dd>{{ formatCurrency(loan.principal) }}</dd>
        <dt class="text-gray-500">{{ t('collections.overview.loanCard.outstandingBalance') }}</dt>
        <dd class="font-semibold">{{ formatCurrency(loan.outstandingBalance) }}</dd>
        <dt class="text-gray-500">{{ t('collections.overview.loanCard.loanStatus') }}</dt>
        <dd><StatusBadge :status="loan.status" /></dd>
        <dt class="text-gray-500">{{ t('collections.overview.loanCard.maturityDate') }}</dt>
        <dd>{{ formatDate(loan.maturityDate) }}</dd>
      </dl>
      <UButton
        :to="`/loans/${loan.id}`"
        variant="link"
        icon="i-heroicons-arrow-top-right-on-square"
        class="px-0 mt-3"
      >
        {{ t('collections.overview.loanCard.openLoan') }}
      </UButton>
    </UCard>

    <UCard v-if="collectionCase">
      <template #header>
        <span class="font-semibold">{{ t('collections.overview.caseCard.title') }}</span>
      </template>
      <dl class="grid grid-cols-2 gap-y-3 text-sm">
        <dt class="text-gray-500">{{ t('collections.overview.caseCard.status') }}</dt>
        <dd><StatusBadge :status="collectionCase.status" /></dd>
        <dt class="text-gray-500">{{ t('collections.overview.caseCard.assignedTo') }}</dt>
        <dd>{{ assigneeName(collectionCase.assignedToUserId) }}</dd>
        <dt class="text-gray-500">{{ t('collections.overview.caseCard.lastContact') }}</dt>
        <dd>{{ formatDateTime(collectionCase.lastContactAt) || '—' }}</dd>
        <dt class="text-gray-500">{{ t('collections.overview.caseCard.nextFollowUp') }}</dt>
        <dd>{{ formatDate(collectionCase.nextFollowUpAt) || '—' }}</dd>
      </dl>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { CollectionCaseResponse } from '~/features/collections/types'
import type { LoanResponse } from '~/features/loans/types'
import type { UserResponse } from '~/features/users/types'
import type { PageResponse } from '~/shared/types'

const route = useRoute()
const api = useApi()
const { t } = useI18n()
const { isAdmin } = storeToRefs(useAuth())

const loanId = route.params.loanId as string

const { data: loan } = await useAsyncData(`collection-case-${loanId}-loan`, () =>
  api<LoanResponse>(`/loans/${loanId}`)
)
const { data: collectionCase } = await useAsyncData(`collection-case-${loanId}-case`, () =>
  api<CollectionCaseResponse>(`/payments/collections/${loanId}/case`)
)
const { data: usersPage } = await useAsyncData(`collection-case-${loanId}-users`, () =>
  isAdmin.value ? api<PageResponse<UserResponse>>('/auth/users?size=200') : Promise.resolve(null)
)

const userMap = computed(() => new Map((usersPage.value?.content ?? []).map((u) => [u.id, u.username])))

function assigneeName(userId: number | null | undefined) {
  if (!userId) return '—'
  return userMap.value.get(userId) ?? t('collections.shared.userFallback', { id: userId })
}
</script>
