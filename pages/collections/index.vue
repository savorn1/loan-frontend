<template>
  <div>
    <PageHeader :title="t('collections.list.title')" :description="totalLabel" />

    <UCard class="mb-6">
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex flex-wrap gap-1.5">
          <UButton
            v-for="opt in bucketOptions"
            :key="opt.value"
            size="sm"
            :color="bucketFilter === opt.value ? 'primary' : 'gray'"
            :variant="bucketFilter === opt.value ? 'solid' : 'soft'"
            @click="bucketFilter = opt.value"
          >
            {{ opt.label }}
          </UButton>
        </div>

        <USelectMenu
          v-model="assignedFilter"
          :options="assignedFilterOptions"
          option-attribute="label"
          value-attribute="value"
          class="w-full sm:w-48"
        />

        <UButton
          v-if="hasFilters"
          variant="ghost"
          color="gray"
          icon="i-heroicons-x-mark"
          @click="clearFilters"
        >
          {{ t('collections.list.clearFilters') }}
        </UButton>
      </div>
    </UCard>

    <UCard>
      <UAlert
        v-if="fetchError"
        color="red"
        variant="subtle"
        class="mb-4"
        :title="apiErrorMessage(fetchError)"
      />

      <DataTable
        v-model:sort="sort"
        v-model:selected="selectedRows"
        :rows="rows"
        :columns="columns"
        :loading="pending"
        :selectable="isAdmin"
        numbered
        refreshable
        :row-number-start="(page - 1) * pageSize"
        @refresh="refresh"
      >
        <template #bulk-actions="{ selected: sel, clear: clearSelection }">
          <UButton
            size="xs"
            variant="soft"
            icon="i-heroicons-user-plus"
            @click="openBulkAssign(sel, clearSelection)"
          >
            {{ t('collections.list.bulk.assignSelected', { count: sel.length }) }}
          </UButton>
        </template>
        <template #bucket-data="{ row }">
          <UBadge :color="bucketColor(row.bucket)" variant="subtle">{{
            bucketLabel(row.bucket)
          }}</UBadge>
        </template>
        <template #caseStatus-data="{ row }">
          <StatusBadge v-if="row.caseStatus" :status="row.caseStatus" />
          <UBadge v-else color="gray" variant="subtle">{{
            t('collections.list.unassigned')
          }}</UBadge>
        </template>
        <template #assignedToUserId-data="{ row }">
          <span class="text-sm text-gray-700 dark:text-gray-300">{{
            assigneeName(row.assignedToUserId)
          }}</span>
        </template>
        <template #actions-data="{ row }">
          <div class="flex gap-1 justify-end">
            <UButton
              size="2xs"
              variant="soft"
              icon="i-heroicons-chat-bubble-left-ellipsis"
              @click="openNote(row)"
            >
              {{ t('collections.list.actions.note') }}
            </UButton>
            <UButton
              v-if="isAdmin"
              size="2xs"
              variant="soft"
              icon="i-heroicons-user-plus"
              @click="openAssign(row)"
            >
              {{ t('collections.list.actions.assign') }}
            </UButton>
            <UButton
              size="2xs"
              variant="soft"
              color="gray"
              icon="i-heroicons-folder-open"
              :to="`/collections/${row.loanId}`"
            >
              {{ t('collections.list.actions.case') }}
            </UButton>
            <UButton
              size="2xs"
              color="gray"
              variant="ghost"
              icon="i-heroicons-arrow-top-right-on-square"
              :aria-label="t('collections.list.actions.viewLoan')"
              :to="`/loans/${row.loanId}`"
            />
          </div>
        </template>
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-check-circle"
            :title="hasFilters ? t('common.noMatches') : t('collections.list.emptyOverdue.title')"
            :description="
              hasFilters
                ? t('collections.list.emptyFiltered.description')
                : t('collections.list.emptyOverdue.description')
            "
          />
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>

    <UModal v-model="showAssign">
      <UCard>
        <template #header>
          <span class="font-semibold">{{
            t('collections.list.assignModal.title', {
              id: assigningRow ? loanLabel(assigningRow.loanId) : ''
            })
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

    <UModal v-model="showBulkAssign">
      <UCard>
        <template #header>
          <span class="font-semibold">{{
            t('collections.list.bulk.assignModalTitle', { count: bulkAssignTargets.length })
          }}</span>
        </template>
        <DynamicForm
          v-model="bulkAssignForm"
          :fields="assignFields"
          :loading="bulkAssigning"
          :error="bulkAssignError"
          :submit-label="t('collections.shared.assign')"
          cancelable
          @submit="onBulkAssign"
          @cancel="showBulkAssign = false"
        />
      </UCard>
    </UModal>

    <UModal v-model="showNote">
      <UCard>
        <template #header>
          <span class="font-semibold">{{
            t('collections.list.noteModal.title', { id: noteRow ? loanLabel(noteRow.loanId) : '' })
          }}</span>
        </template>

        <div v-if="notesLoading" class="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
          {{ t('collections.list.noteModal.loading') }}
        </div>
        <ol v-else-if="notes.length" class="space-y-3 mb-4 max-h-56 overflow-y-auto pr-1">
          <li
            v-for="n in notes"
            :key="n.id"
            class="text-sm border-b border-gray-100 dark:border-gray-800 pb-2 last:border-0"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="font-medium text-gray-900 dark:text-white">
                {{ formatEnum(n.contactMethod) }} — {{ formatEnum(n.outcome) }}
              </span>
              <span class="text-xs text-gray-400 dark:text-gray-500 shrink-0">{{
                formatDateTime(n.createdAt)
              }}</span>
            </div>
            <p class="text-gray-600 dark:text-gray-400 mt-0.5">{{ n.note }}</p>
            <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{{ n.authorName }}</p>
          </li>
        </ol>
        <p v-else class="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {{ t('collections.list.noteModal.empty') }}
        </p>

        <DynamicForm
          v-model="noteForm"
          :fields="noteFields"
          :loading="addingNote"
          :error="noteError"
          :submit-label="t('collections.list.noteModal.submit')"
          cancelable
          @submit="onAddNote"
          @cancel="showNote = false"
        />
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type {
  CollectionActivityResponse,
  CollectionBucket,
  CollectionWorkqueueItemResponse
} from '~/features/collections/types'
import type { UserResponse } from '~/features/users/types'
import type { ColumnDef, FieldDef, PageResponse } from '~/shared/types'

const api = useApi()
const toast = useToast()
const { t } = useI18n()
const { isAdmin } = storeToRefs(useAuth())

// /live computes overdue status from due dates on the fly instead of relying on
// OverdueScheduler's nightly cron to have already flagged a payment OVERDUE — so a
// loan that just crossed its due date shows up here immediately, not tomorrow.
const {
  data: items,
  pending,
  error: fetchError,
  refresh
} = await useAsyncData('collections-workqueue', () =>
  api<CollectionWorkqueueItemResponse[]>('/payments/collections/live')
)

const { data: usersPage } = await useAsyncData('collections-users', () =>
  isAdmin.value ? api<PageResponse<UserResponse>>('/auth/users?size=200') : Promise.resolve(null)
)

const { loanLabel } = await useLoanLookup('collections-loans')

const userMap = computed(
  () => new Map((usersPage.value?.content ?? []).map((u) => [u.id, u.username]))
)

function assigneeName(userId: number | null) {
  if (!userId) return '—'
  return userMap.value.get(userId) ?? t('collections.shared.userFallback', { id: userId })
}

const BUCKET_META = computed<Record<CollectionBucket, { label: string; color: string }>>(() => ({
  DPD_1_30: { label: t('collections.list.bucketLabels.b1_30'), color: 'orange' },
  DPD_31_60: { label: t('collections.list.bucketLabels.b31_60'), color: 'orange' },
  DPD_61_90: { label: t('collections.list.bucketLabels.b61_90'), color: 'red' },
  DPD_90_PLUS: { label: t('collections.list.bucketLabels.b90Plus'), color: 'red' }
}))
function bucketLabel(bucket: CollectionBucket) {
  return BUCKET_META.value[bucket].label
}

function bucketColor(bucket: CollectionBucket): any {
  return BUCKET_META.value[bucket].color
}

const bucketOptions = computed<{ label: string; value: CollectionBucket | 'ALL' }[]>(() => [
  { label: t('collections.list.bucketFilters.all'), value: 'ALL' },
  { label: t('collections.list.bucketFilters.b1_30'), value: 'DPD_1_30' },
  { label: t('collections.list.bucketFilters.b31_60'), value: 'DPD_31_60' },
  { label: t('collections.list.bucketFilters.b61_90'), value: 'DPD_61_90' },
  { label: t('collections.list.bucketFilters.b90Plus'), value: 'DPD_90_PLUS' }
])
const bucketFilter = ref<CollectionBucket | 'ALL'>('ALL')

const assignedFilterOptions = computed(() => [
  { label: t('collections.list.filters.everyone'), value: 'ALL' },
  { label: t('collections.list.filters.unassigned'), value: 'UNASSIGNED' },
  ...(usersPage.value?.content ?? []).map((u) => ({
    label: t('collections.list.filters.assignedTo', { name: u.username }),
    value: u.id
  }))
])
const assignedFilter = ref<'ALL' | 'UNASSIGNED' | number>('ALL')

const filteredItems = computed(() =>
  (items.value ?? []).filter((item) => {
    if (bucketFilter.value !== 'ALL' && item.bucket !== bucketFilter.value) return false
    if (assignedFilter.value === 'UNASSIGNED' && item.assignedToUserId) return false
    if (typeof assignedFilter.value === 'number' && item.assignedToUserId !== assignedFilter.value)
      return false
    return true
  })
)

const { page, pageSize, sort, total, rows } = useClientTable(filteredItems, { pageSize: 10 })

const hasFilters = computed(() => bucketFilter.value !== 'ALL' || assignedFilter.value !== 'ALL')
function clearFilters() {
  bucketFilter.value = 'ALL'
  assignedFilter.value = 'ALL'
}

const totalLabel = computed(() => {
  const count = items.value?.length ?? 0
  return count === 1 ? t('collections.list.totalOne') : t('collections.list.totalMany', { count })
})

const columns = computed<ColumnDef<CollectionWorkqueueItemResponse>[]>(() => [
  {
    key: 'loanId',
    label: t('collections.list.columns.loan'),
    type: 'link',
    sortable: true,
    href: (row) => `/loans/${row.loanId}`,
    value: (row) => loanLabel(row.loanId)
  },
  { key: 'customerName', label: t('collections.list.columns.customer'), sortable: true },
  { key: 'customerPhone', label: t('collections.list.columns.phone') },
  {
    key: 'totalOverdueAmount',
    label: t('collections.list.columns.overdue'),
    type: 'currency',
    sortable: true
  },
  {
    key: 'oldestDueDate',
    label: t('collections.list.columns.oldestDue'),
    type: 'date',
    sortable: true
  },
  { key: 'maxDpd', label: t('collections.list.columns.dpd'), sortable: true },
  { key: 'bucket', label: t('collections.list.columns.bucket') },
  { key: 'caseStatus', label: t('collections.list.columns.case') },
  { key: 'assignedToUserId', label: t('collections.list.columns.assignedTo') },
  { key: 'actions', label: '', class: 'text-right' }
])

// ── Assign modal ────────────────────────────────────────────────────────
const showAssign = ref(false)
const assigningRow = ref<CollectionWorkqueueItemResponse | null>(null)
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
  }
])

function openAssign(row: CollectionWorkqueueItemResponse) {
  assigningRow.value = row
  assignForm.value = { userId: row.assignedToUserId ?? undefined }
  assignError.value = ''
  showAssign.value = true
}

async function onAssign(values: Record<string, any>) {
  if (!assigningRow.value) return
  assigning.value = true
  assignError.value = ''
  try {
    await api(`/payments/collections/${assigningRow.value.loanId}/assign`, {
      method: 'PUT',
      body: { userId: values.userId }
    })
    toast.add({ title: t('collections.shared.loanAssigned'), color: 'green' })
    showAssign.value = false
    await refresh()
  } catch (err) {
    assignError.value = apiErrorMessage(err)
  } finally {
    assigning.value = false
  }
}

// ── Bulk assign ─────────────────────────────────────────────────────────
const selectedRows = ref<CollectionWorkqueueItemResponse[]>([])
const showBulkAssign = ref(false)
const bulkAssignTargets = ref<CollectionWorkqueueItemResponse[]>([])
const bulkAssignClear = ref<() => void>(() => {})
const bulkAssigning = ref(false)
const bulkAssignError = ref('')
const bulkAssignForm = ref<Record<string, any>>({})

function openBulkAssign(sel: CollectionWorkqueueItemResponse[], clear: () => void) {
  bulkAssignTargets.value = sel
  bulkAssignClear.value = clear
  bulkAssignForm.value = {}
  bulkAssignError.value = ''
  showBulkAssign.value = true
}

async function onBulkAssign(values: Record<string, any>) {
  bulkAssigning.value = true
  bulkAssignError.value = ''
  try {
    await Promise.all(
      bulkAssignTargets.value.map((item) =>
        api(`/payments/collections/${item.loanId}/assign`, {
          method: 'PUT',
          body: { userId: values.userId }
        })
      )
    )
    toast.add({
      title: t('collections.list.bulk.assignedToast', { count: bulkAssignTargets.value.length }),
      color: 'green'
    })
    showBulkAssign.value = false
    bulkAssignClear.value()
    await refresh()
  } catch (err) {
    bulkAssignError.value = apiErrorMessage(err)
  } finally {
    bulkAssigning.value = false
  }
}

// ── Note modal ──────────────────────────────────────────────────────────
const showNote = ref(false)
const noteRow = ref<CollectionWorkqueueItemResponse | null>(null)
const notes = ref<CollectionActivityResponse[]>([])
const notesLoading = ref(false)
const addingNote = ref(false)
const noteError = ref('')
const noteForm = ref<Record<string, any>>({})

const noteFields = computed<FieldDef[]>(() => [
  {
    name: 'contactMethod',
    label: t('collections.list.noteModal.contactMethod'),
    type: 'select',
    required: true,
    options: [
      { label: t('collections.shared.contactMethods.phone'), value: 'PHONE' },
      { label: t('collections.shared.contactMethods.email'), value: 'EMAIL' },
      { label: t('collections.shared.contactMethods.sms'), value: 'SMS' },
      { label: t('collections.shared.contactMethods.visit'), value: 'VISIT' },
      { label: t('collections.shared.contactMethods.other'), value: 'OTHER' }
    ]
  },
  {
    name: 'outcome',
    label: t('collections.list.noteModal.outcome'),
    type: 'select',
    required: true,
    options: [
      { label: t('collections.shared.outcomes.noAnswer'), value: 'NO_ANSWER' },
      { label: t('collections.shared.outcomes.promiseToPay'), value: 'PROMISE_TO_PAY' },
      { label: t('collections.shared.outcomes.disputed'), value: 'DISPUTED' },
      { label: t('collections.shared.outcomes.paid'), value: 'PAID' },
      { label: t('collections.shared.outcomes.leftMessage'), value: 'LEFT_MESSAGE' },
      { label: t('collections.shared.outcomes.other'), value: 'OTHER' }
    ]
  },
  {
    name: 'note',
    label: t('collections.list.noteModal.note'),
    type: 'textarea',
    required: true,
    rows: 3
  },
  { name: 'followUpDate', label: t('collections.list.noteModal.nextFollowUp'), type: 'date' }
])

function resetNoteForm() {
  noteForm.value = { contactMethod: undefined, outcome: undefined, note: '', followUpDate: '' }
}

async function openNote(row: CollectionWorkqueueItemResponse) {
  noteRow.value = row
  resetNoteForm()
  noteError.value = ''
  showNote.value = true
  notesLoading.value = true
  try {
    notes.value = await api<CollectionActivityResponse[]>(
      `/payments/collections/${row.loanId}/activities`
    )
  } finally {
    notesLoading.value = false
  }
}

async function onAddNote(values: Record<string, any>) {
  if (!noteRow.value) return
  addingNote.value = true
  noteError.value = ''
  try {
    const created = await api<CollectionActivityResponse>(
      `/payments/collections/${noteRow.value.loanId}/activities`,
      {
        method: 'POST',
        body: {
          contactMethod: values.contactMethod,
          outcome: values.outcome,
          note: values.note,
          followUpDate: values.followUpDate || undefined
        }
      }
    )
    notes.value = [created, ...notes.value]
    resetNoteForm()
    toast.add({ title: t('collections.list.noteModal.success'), color: 'green' })
    await refresh()
  } catch (err) {
    noteError.value = apiErrorMessage(err)
  } finally {
    addingNote.value = false
  }
}
</script>
