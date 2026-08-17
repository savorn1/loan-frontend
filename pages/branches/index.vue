<template>
  <div>
    <PageHeader :title="t('admin.branches.title')" :description="totalLabel">
      <template #actions>
        <UButton icon="i-heroicons-plus" @click="openCreate">{{
          t('admin.branches.newBranch')
        }}</UButton>
      </template>
    </PageHeader>

    <UCard>
      <template #header>
        <div class="flex flex-wrap items-center gap-3">
          <UInput
            v-model="search"
            icon="i-heroicons-magnifying-glass"
            :placeholder="t('admin.branches.searchPlaceholder')"
            class="max-w-xs w-full sm:w-auto"
          >
            <template v-if="search" #trailing>
              <UButton
                color="gray"
                variant="link"
                icon="i-heroicons-x-mark"
                :aria-label="t('common.clearSearch')"
                :padded="false"
                @click="search = ''"
              />
            </template>
          </UInput>
          <DateRangeFilter v-model:from="dateFrom" v-model:to="dateTo" />
          <UButton
            v-if="hasFilters"
            variant="ghost"
            color="gray"
            icon="i-heroicons-x-mark"
            @click="clearFilters"
          >
            {{ t('common.clearFilters') }}
          </UButton>
        </div>
      </template>

      <UAlert
        v-if="fetchError"
        color="red"
        variant="subtle"
        class="mb-4"
        :title="apiErrorMessage(fetchError)"
      />

      <DataTable
        :rows="rows"
        :columns="columns"
        :loading="pending"
        numbered
        refreshable
        :row-number-start="(page - 1) * pageSize"
        @refresh="refresh"
      >
        <template #status-data="{ row }">
          <UBadge :color="row.status === 'ACTIVE' ? 'green' : 'gray'" variant="subtle">
            {{ row.status === 'ACTIVE' ? t('common.active') : t('common.inactive') }}
          </UBadge>
        </template>
        <template #actions-data="{ row }">
          <div class="flex gap-1 justify-end">
            <UButton
              size="2xs"
              variant="soft"
              icon="i-heroicons-clock"
              :aria-label="t('admin.branches.businessHours')"
              @click.stop="openHours(row)"
            />
            <UButton
              size="2xs"
              variant="soft"
              icon="i-heroicons-pencil"
              :aria-label="t('common.edit')"
              @click.stop="openEdit(row)"
            />
            <UButton
              size="2xs"
              color="red"
              variant="soft"
              icon="i-heroicons-trash"
              :aria-label="t('common.delete')"
              @click.stop="confirmDelete = row"
            />
          </div>
        </template>
        <template #empty-state>
          <EmptyState
            :icon="search ? 'i-heroicons-magnifying-glass' : 'i-heroicons-building-office-2'"
            :title="
              search ? t('admin.branches.empty.matchesTitle') : t('admin.branches.empty.emptyTitle')
            "
            :description="
              search
                ? t('admin.branches.empty.matchesDescription', { query: search })
                : t('admin.branches.empty.emptyDescription')
            "
          >
            <template v-if="!search" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">{{
                t('admin.branches.newBranch')
              }}</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>

    <UModal v-model="showCreate">
      <UCard>
        <template #header>
          <span class="font-semibold">{{ t('admin.branches.createModalTitle') }}</span>
        </template>
        <DynamicForm
          v-model="createForm"
          :fields="fields"
          :loading="creating"
          :error="error"
          :submit-label="t('common.create')"
          cancelable
          @submit="onCreate"
          @cancel="showCreate = false"
        />
      </UCard>
    </UModal>

    <UModal v-model="showEdit">
      <UCard>
        <template #header>
          <span class="font-semibold">{{ t('admin.branches.editModalTitle') }}</span>
        </template>
        <DynamicForm
          v-model="editForm"
          :fields="fields"
          :loading="editing"
          :error="editError"
          :submit-label="t('common.saveChanges')"
          cancelable
          @submit="onEdit"
          @cancel="showEdit = false"
        />
      </UCard>
    </UModal>

    <UModal v-model="showHours" :ui="{ width: 'sm:max-w-2xl' }">
      <UCard v-if="hoursTargetBranch">
        <template #header>
          <span class="font-semibold">{{
            t('admin.branches.hoursModal.title', { name: hoursTargetBranch.name })
          }}</span>
        </template>
        <div v-if="hoursPending" class="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
          {{ t('admin.shared.loading') }}
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="day in daysOfWeek"
            :key="day"
            class="flex flex-wrap items-center gap-3 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
          >
            <span class="w-28 shrink-0 text-sm font-medium text-gray-900 dark:text-white">
              {{ t(`admin.branches.hoursModal.days.${day}`) }}
            </span>
            <UCheckbox
              v-model="hoursForm[day].isClosed"
              :label="t('admin.branches.hoursModal.closed')"
            />
            <template v-if="!hoursForm[day].isClosed">
              <UInput v-model="hoursForm[day].openingTime" type="time" class="w-32" />
              <span class="text-gray-400">–</span>
              <UInput v-model="hoursForm[day].closingTime" type="time" class="w-32" />
            </template>
          </div>
        </div>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton color="gray" variant="ghost" @click="showHours = false">{{
              t('common.cancel')
            }}</UButton>
            <UButton :loading="savingHours" @click="onSaveHours">{{
              t('common.saveChanges')
            }}</UButton>
          </div>
        </template>
      </UCard>
    </UModal>

    <ConfirmModal
      :model-value="confirmDelete !== null"
      :title="
        confirmDelete ? t('admin.branches.deleteConfirmTitle', { name: confirmDelete.name }) : ''
      "
      :description="confirmDelete ? t('admin.branches.deleteConfirmDescription') : ''"
      :confirm-label="t('common.delete')"
      color="red"
      :loading="deleting"
      @update:model-value="
        (v: boolean) => {
          if (!v) confirmDelete = null
        }
      "
      @confirm="onDelete"
    />
  </div>
</template>

<script setup lang="ts">
import type {
  BranchBusinessHoursRequest,
  BranchBusinessHoursResponse,
  BranchRequest,
  BranchResponse,
  DayOfWeek
} from '~/features/branches/types'
import { DAYS_OF_WEEK } from '~/features/branches/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

definePageMeta({ middleware: 'admin' })

const { t } = useI18n()
const api = useApi()
const toast = useToast()

const {
  data: branches,
  pending,
  error: fetchError,
  refresh
} = await useAsyncData('branches', () => api<BranchResponse[]>('/branches'))

const search = ref('')
const { from: dateFrom, to: dateTo, inRange } = useDateRangeFilter()
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  const list = (branches.value ?? []).filter((b) => inRange(b.createdAt))
  if (!q) return list
  return list.filter((b) => b.name.toLowerCase().includes(q) || b.code.toLowerCase().includes(q))
})

const { page, pageSize, total, rows } = useClientTable(filtered, { pageSize: 10 })

const hasFilters = computed(() => !!search.value || !!dateFrom.value || !!dateTo.value)

function clearFilters() {
  search.value = ''
  dateFrom.value = ''
  dateTo.value = ''
}

const totalLabel = computed(() => {
  const count = branches.value?.length ?? 0
  return count === 1 ? t('admin.branches.total.one') : t('admin.branches.total.other', { count })
})

const columns = computed<ColumnDef<BranchResponse>[]>(() => [
  { key: 'code', label: t('admin.branches.columns.code'), sortable: true },
  { key: 'name', label: t('admin.branches.columns.name'), sortable: true },
  { key: 'address', label: t('admin.branches.columns.address') },
  { key: 'phone', label: t('admin.branches.columns.phone') },
  { key: 'status', label: t('admin.branches.columns.status') },
  { key: 'createdAt', label: t('admin.branches.columns.created'), type: 'datetime' },
  { key: 'actions', label: '', class: 'text-right' }
])

const fields = computed<FieldDef[]>(() => [
  {
    name: 'code',
    label: t('admin.branches.fields.code'),
    hint: t('admin.branches.fields.codeHint'),
    required: true,
    wrapper: 'half'
  },
  { name: 'name', label: t('admin.branches.fields.name'), required: true, wrapper: 'half' },
  { name: 'address', label: t('admin.branches.fields.address') },
  { name: 'phone', label: t('admin.branches.fields.phone'), type: 'phone', wrapper: 'half' },
  {
    name: 'status',
    label: t('admin.branches.fields.status'),
    type: 'select',
    required: true,
    default: 'ACTIVE',
    wrapper: 'half',
    options: [
      { label: t('common.active'), value: 'ACTIVE' },
      { label: t('common.inactive'), value: 'INACTIVE' }
    ]
  }
])

const {
  showCreate,
  creating,
  error,
  createForm,
  openCreate,
  onCreate,
  showEdit,
  editing,
  editError,
  editForm,
  openEdit,
  onEdit,
  deleting,
  confirmDelete,
  onDelete
} = useCrudModals<BranchResponse, BranchRequest>('/branches', refresh, {
  entityName: t('admin.entities.branch'),
  createDefaults: () => ({ code: '', name: '', address: '', phone: '', status: 'ACTIVE' }),
  toForm: (row) => ({
    code: row.code,
    name: row.name,
    address: row.address ?? '',
    phone: row.phone ?? '',
    status: row.status
  }),
  toPayload: (values) => ({
    code: values.code,
    name: values.name,
    address: values.address || undefined,
    phone: values.phone || undefined,
    status: values.status
  })
})

// ── Weekly business hours (upserted by day — see branch-service's
// PUT /branches/{id}/business-hours/{dayOfWeek}) ───────────────────────────
const daysOfWeek = DAYS_OF_WEEK

type HoursFormRow = { isClosed: boolean; openingTime: string; closingTime: string }

const showHours = ref(false)
const hoursPending = ref(false)
const savingHours = ref(false)
const hoursTargetBranch = ref<BranchResponse | null>(null)
const hoursForm = reactive<Record<DayOfWeek, HoursFormRow>>(
  Object.fromEntries(
    daysOfWeek.map((day) => [day, { isClosed: true, openingTime: '', closingTime: '' }])
  ) as Record<DayOfWeek, HoursFormRow>
)

async function openHours(row: BranchResponse) {
  hoursTargetBranch.value = row
  showHours.value = true
  hoursPending.value = true
  for (const day of daysOfWeek) {
    hoursForm[day] = { isClosed: true, openingTime: '', closingTime: '' }
  }
  try {
    const existing = await api<BranchBusinessHoursResponse[]>(`/branches/${row.id}/business-hours`)
    for (const hours of existing) {
      hoursForm[hours.dayOfWeek] = {
        isClosed: hours.isClosed,
        openingTime: hours.openingTime?.slice(0, 5) ?? '',
        closingTime: hours.closingTime?.slice(0, 5) ?? ''
      }
    }
  } finally {
    hoursPending.value = false
  }
}

async function onSaveHours() {
  if (!hoursTargetBranch.value) return
  savingHours.value = true
  try {
    const branchId = hoursTargetBranch.value.id
    await Promise.all(
      daysOfWeek.map((day) => {
        const row = hoursForm[day]
        const payload: BranchBusinessHoursRequest = {
          isClosed: row.isClosed,
          openingTime: row.isClosed ? undefined : row.openingTime,
          closingTime: row.isClosed ? undefined : row.closingTime
        }
        return api(`/branches/${branchId}/business-hours/${day}`, { method: 'PUT', body: payload })
      })
    )
    toast.add({ title: t('admin.branches.hoursModal.toastSaved'), color: 'green' })
    showHours.value = false
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    savingHours.value = false
  }
}
</script>
