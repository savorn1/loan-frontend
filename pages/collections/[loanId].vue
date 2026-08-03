<template>
  <div v-if="loan">
    <UButton
      to="/collections"
      variant="link"
      icon="i-heroicons-arrow-left"
      size="xs"
      class="mb-1 px-0"
    >
      {{ t('collections.shell.backToCollections') }}
    </UButton>

    <div class="flex items-center justify-between mb-6 gap-4">
      <div class="flex items-center gap-3 min-w-0">
        <h1 class="text-xl font-bold truncate">
          {{ t('collections.shell.caseTitle', { id: loan.id }) }}
        </h1>
        <StatusBadge v-if="collectionCase" :status="collectionCase.status" />
      </div>
      <div v-if="isAdmin" class="flex gap-2 shrink-0">
        <UButton size="sm" variant="soft" icon="i-heroicons-user-plus" @click="openAssign">
          {{ t('collections.shell.reassign') }}
        </UButton>
        <UButton size="sm" variant="soft" icon="i-heroicons-arrow-path" @click="openStatus">
          {{ t('collections.shell.updateStatus') }}
        </UButton>
      </div>
    </div>

    <div class="flex flex-col md:flex-row gap-6">
      <div class="md:w-52 shrink-0">
        <UVerticalNavigation
          :links="tabLinks"
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

      <div class="flex-1 min-w-0">
        <NuxtPage />
      </div>
    </div>

    <UModal v-model="showAssign">
      <UCard>
        <template #header>
          <span class="font-semibold">{{
            t('collections.shell.reassignModal.title', { id: loan.id })
          }}</span>
        </template>
        <DynamicForm
          v-model="assignForm"
          :fields="assignFields"
          :loading="assigning"
          :error="assignError"
          :submit-label="t('collections.shared.assign')"
          cancelable
          @submit="onAssign"
          @cancel="showAssign = false"
        />
      </UCard>
    </UModal>

    <UModal v-model="showStatus">
      <UCard>
        <template #header>
          <span class="font-semibold">{{ t('collections.shell.statusModal.title') }}</span>
        </template>
        <DynamicForm
          v-model="statusForm"
          :fields="statusFields"
          :loading="updatingStatus"
          :error="statusError"
          :submit-label="t('collections.shell.statusModal.submit')"
          cancelable
          @submit="onUpdateStatus"
          @cancel="showStatus = false"
        />
      </UCard>
    </UModal>
  </div>
  <div v-else-if="loanError" class="py-8">
    <ErrorState :title="t('common.errorState.title')" :description="apiErrorMessage(loanError)">
      <template #action>
        <UButton
          size="sm"
          variant="soft"
          icon="i-heroicons-arrow-path"
          :loading="loanPending"
          @click="refreshLoan()"
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
// Tab shell shared by every /collections/:loanId/** page — renders the case
// header (back link, status, admin assign/status actions) once and hosts the
// tab body via <NuxtPage/>. Nuxt nests pages/collections/[loanId]/*.vue routes
// inside this file automatically because it shares the [loanId] param.
import type {
  AssignCollectionCaseRequest,
  CollectionCaseResponse,
  UpdateCollectionCaseStatusRequest
} from '~/features/collections/types'
import type { LoanResponse } from '~/features/loans/types'
import type { UserResponse } from '~/features/users/types'
import type { FieldDef, PageResponse } from '~/shared/types'

const route = useRoute()
const api = useApi()
const toast = useToast()
const { t } = useI18n()
const { isAdmin } = storeToRefs(useAuth())

const loanId = route.params.loanId as string

const {
  data: loan,
  error: loanError,
  pending: loanPending,
  refresh: refreshLoan
} = await useAsyncData(`collection-case-${loanId}-loan`, () =>
  api<LoanResponse>(`/loans/${loanId}`)
)
const { data: collectionCase, refresh: refreshCase } = await useAsyncData(
  `collection-case-${loanId}-case`,
  () => api<CollectionCaseResponse>(`/payments/collections/${loanId}/case`)
)
const { data: usersPage } = await useAsyncData(`collection-case-${loanId}-users`, () =>
  isAdmin.value ? api<PageResponse<UserResponse>>('/auth/users?size=200') : Promise.resolve(null)
)

const tabLinks = computed(() => [
  {
    label: t('collections.shell.tabs.overview'),
    to: `/collections/${loanId}`,
    exact: true,
    icon: 'i-heroicons-squares-2x2'
  },
  {
    label: t('collections.shell.tabs.activities'),
    to: `/collections/${loanId}/activities`,
    icon: 'i-heroicons-chat-bubble-left-right'
  },
  {
    label: t('collections.shell.tabs.promises'),
    to: `/collections/${loanId}/promises`,
    icon: 'i-heroicons-hand-raised'
  },
  {
    label: t('collections.shell.tabs.letters'),
    to: `/collections/${loanId}/letters`,
    icon: 'i-heroicons-envelope'
  },
  {
    label: t('collections.shell.tabs.assignments'),
    to: `/collections/${loanId}/assignments`,
    icon: 'i-heroicons-user-group'
  },
  {
    label: t('collections.shell.tabs.statusHistory'),
    to: `/collections/${loanId}/status-history`,
    icon: 'i-heroicons-clock'
  }
])

// ── Reassign modal ──────────────────────────────────────────────────────
const showAssign = ref(false)
const assigning = ref(false)
const assignError = ref('')
const assignForm = ref<Record<string, any>>({})

const userOptions = computed(() =>
  (usersPage.value?.content ?? []).map((u) => ({ label: u.username, value: u.id }))
)

const assignFields = computed<FieldDef[]>(() => [
  {
    name: 'userId',
    label: t('collections.shared.assignTo'),
    type: 'select',
    required: true,
    options: userOptions.value,
    placeholder: t('collections.shared.selectUser')
  },
  {
    name: 'note',
    label: t('collections.shared.note'),
    type: 'textarea',
    rows: 2,
    hint: t('collections.shell.reassignModal.noteHint')
  }
])

function openAssign() {
  assignForm.value = { userId: collectionCase.value?.assignedToUserId ?? undefined, note: '' }
  assignError.value = ''
  showAssign.value = true
}

async function onAssign(values: Record<string, any>) {
  assigning.value = true
  assignError.value = ''
  try {
    const payload: AssignCollectionCaseRequest = {
      userId: values.userId,
      note: values.note || undefined
    }
    await api(`/payments/collections/${loanId}/assign`, { method: 'PUT', body: payload })
    toast.add({ title: t('collections.shared.loanAssigned'), color: 'green' })
    showAssign.value = false
    await refreshCase()
  } catch (err) {
    assignError.value = apiErrorMessage(err)
  } finally {
    assigning.value = false
  }
}

// ── Update status modal ─────────────────────────────────────────────────
const showStatus = ref(false)
const updatingStatus = ref(false)
const statusError = ref('')
const statusForm = ref<Record<string, any>>({})

const statusFields = computed<FieldDef[]>(() => [
  {
    name: 'status',
    label: t('collections.shell.statusModal.status'),
    type: 'select',
    required: true,
    options: [
      { label: t('collections.shell.statusModal.options.open'), value: 'OPEN' },
      { label: t('collections.shell.statusModal.options.inProgress'), value: 'IN_PROGRESS' },
      { label: t('collections.shell.statusModal.options.resolved'), value: 'RESOLVED' }
    ]
  },
  {
    name: 'note',
    label: t('collections.shared.note'),
    type: 'textarea',
    rows: 2,
    hint: t('collections.shell.statusModal.noteHint')
  }
])

function openStatus() {
  statusForm.value = { status: collectionCase.value?.status, note: '' }
  statusError.value = ''
  showStatus.value = true
}

async function onUpdateStatus(values: Record<string, any>) {
  updatingStatus.value = true
  statusError.value = ''
  try {
    const payload: UpdateCollectionCaseStatusRequest = {
      status: values.status,
      note: values.note || undefined
    }
    await api(`/payments/collections/${loanId}/status`, { method: 'PUT', body: payload })
    toast.add({ title: t('collections.shell.statusModal.success'), color: 'green' })
    showStatus.value = false
    await refreshCase()
  } catch (err) {
    statusError.value = apiErrorMessage(err)
  } finally {
    updatingStatus.value = false
  }
}
</script>
