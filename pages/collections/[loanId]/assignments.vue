<template>
  <UCard>
    <template #header>
      <span class="font-semibold">{{ t('collections.assignments.title') }}</span>
    </template>

    <UAlert
      v-if="fetchError"
      color="red"
      variant="subtle"
      class="mb-4"
      :title="apiErrorMessage(fetchError)"
    />

    <ol v-if="(assignments ?? []).length" class="space-y-4">
      <li v-for="entry in assignments" :key="entry.id" class="flex items-start gap-3">
        <div class="flex flex-col items-center pt-0.5">
          <UIcon name="i-heroicons-user-plus" class="w-4 h-4 text-gray-400" />
          <div class="w-px flex-1 bg-gray-200 dark:bg-gray-800 mt-1" />
        </div>
        <div class="pb-1">
          <p class="text-sm">
            {{ t('collections.assignments.assignedTo') }}
            <span class="font-medium">{{ assigneeName(entry.assignedToUserId) }}</span>
          </p>
          <p class="text-xs text-gray-500 mt-1">
            {{ formatDateTime(entry.assignedAt) }} · {{ t('collections.assignments.by') }} {{ entry.assignedBy }}
          </p>
          <p v-if="entry.note" class="text-sm mt-1">{{ entry.note }}</p>
        </div>
      </li>
    </ol>

    <EmptyState
      v-else
      icon="i-heroicons-user-group"
      :title="t('collections.assignments.empty.title')"
      :description="t('collections.assignments.empty.description')"
    />
  </UCard>
</template>

<script setup lang="ts">
import type { CollectionCaseAssignmentResponse } from '~/features/collections/types'
import type { UserResponse } from '~/features/users/types'
import type { PageResponse } from '~/shared/types'

const route = useRoute()
const api = useApi()
const { t } = useI18n()
const { isAdmin } = storeToRefs(useAuth())

const loanId = route.params.loanId as string

const { data: assignments, error: fetchError } = await useAsyncData(
  `collection-case-${loanId}-assignments`,
  () => api<CollectionCaseAssignmentResponse[]>(`/payments/collections/${loanId}/assignments`)
)
const { data: usersPage } = await useAsyncData(`collection-case-${loanId}-users`, () =>
  isAdmin.value ? api<PageResponse<UserResponse>>('/auth/users?size=200') : Promise.resolve(null)
)

const userMap = computed(() => new Map((usersPage.value?.content ?? []).map((u) => [u.id, u.username])))

function assigneeName(userId: number | null) {
  if (!userId) return t('collections.assignments.unassigned')
  return userMap.value.get(userId) ?? t('collections.shared.userFallback', { id: userId })
}
</script>
