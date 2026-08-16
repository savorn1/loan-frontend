<template>
  <div>
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">{{ t('loans.penalties.title') }}</span>
          <UButton v-if="isAdmin" size="xs" icon="i-heroicons-plus" @click="openCreate">{{
            t('loans.penalties.add')
          }}</UButton>
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
        :rows="penalties ?? []"
        :columns="columns"
        :loading="pending"
        numbered
        refreshable
        @refresh="refresh"
      >
        <template #actions-data="{ row }">
          <div class="flex gap-1 justify-end">
            <UButton
              v-if="isAdmin && row.status === 'PENDING'"
              size="2xs"
              variant="soft"
              icon="i-heroicons-pencil"
              :aria-label="t('common.edit')"
              @click="openEdit(row)"
            />
            <UButton
              v-if="isAdmin && row.status === 'PENDING'"
              size="2xs"
              color="red"
              variant="soft"
              icon="i-heroicons-trash"
              :aria-label="t('common.delete')"
              @click="confirmDelete = row"
            />
            <UButton
              v-if="isAdmin && row.status === 'PENDING'"
              size="2xs"
              variant="soft"
              :loading="marking === row.id"
              @click="onMarkPaid(row.id)"
            >
              {{ t('loans.penalties.markPaid') }}
            </UButton>
            <UButton
              v-if="isAdmin && row.status === 'PENDING'"
              size="2xs"
              color="gray"
              variant="soft"
              :loading="waiving === row.id"
              @click="onWaive(row.id)"
            >
              {{ t('loans.penalties.waive') }}
            </UButton>
          </div>
        </template>
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-exclamation-triangle"
            :title="t('loans.penalties.empty.title')"
            :description="t('loans.penalties.empty.description')"
          >
            <template v-if="isAdmin" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">{{
                t('loans.penalties.add')
              }}</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>
    </UCard>

    <UModal v-model="showForm">
      <UCard>
        <template #header>
          <span class="font-semibold">{{
            formMode === 'create' ? t('loans.penalties.add') : t('loans.penalties.editTitle')
          }}</span>
        </template>
        <DynamicForm
          v-model="penaltyForm"
          :fields="fields"
          :loading="submitting"
          :error="error"
          :submit-label="formMode === 'create' ? t('loans.penalties.submit') : t('common.save')"
          cancelable
          @submit="onSubmitForm"
          @cancel="showForm = false"
        />
      </UCard>
    </UModal>

    <ConfirmModal
      :model-value="!!confirmDelete"
      :title="t('loans.penalties.confirmDelete.title')"
      :description="t('loans.penalties.confirmDelete.description')"
      :confirm-label="t('common.delete')"
      color="red"
      :loading="deleting"
      @update:model-value="
        (v: boolean) => {
          if (!v) confirmDelete = null
        }
      "
      @confirm="onConfirmDelete"
    />
  </div>
</template>

<script setup lang="ts">
import type { LoanPenaltyRequest, LoanPenaltyResponse } from '~/features/loans/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

const route = useRoute()
const api = useApi()
const toast = useToast()
const { isAdmin } = storeToRefs(useAuth())
const { t } = useI18n()

const loanId = route.params.id as string

const {
  data: penalties,
  pending,
  error: fetchError,
  refresh
} = await useAsyncData(`loan-${loanId}-penalties`, () =>
  api<LoanPenaltyResponse[]>(`/loans/${loanId}/penalties`)
)

const columns = computed<ColumnDef<LoanPenaltyResponse>[]>(() => [
  { key: 'appliedDate', label: t('loans.penalties.columns.applied'), type: 'date' },
  { key: 'reason', label: t('loans.penalties.columns.reason') },
  { key: 'amount', label: t('loans.penalties.columns.amount'), type: 'currency' },
  { key: 'status', label: t('loans.penalties.columns.status'), type: 'status' },
  { key: 'createdAt', label: t('loans.penalties.columns.created'), type: 'datetime' },
  { key: 'actions', label: t('loans.penalties.columns.actions'), class: 'text-right' }
])

const fields = computed<FieldDef[]>(() => [
  {
    name: 'appliedDate',
    label: t('loans.penalties.fields.appliedDate'),
    type: 'date',
    required: true,
    placeholder: t('loans.penalties.fields.appliedDatePlaceholder')
  },
  { name: 'amount', label: t('loans.penalties.fields.amount'), type: 'currency', required: true },
  { name: 'reason', label: t('loans.penalties.fields.reason'), type: 'textarea', required: true }
])

const showForm = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const editingId = ref<number | null>(null)
const submitting = ref(false)
const error = ref('')
const marking = ref<number | null>(null)
const waiving = ref<number | null>(null)
const penaltyForm = ref<Record<string, any>>({})

function openCreate() {
  formMode.value = 'create'
  editingId.value = null
  penaltyForm.value = { appliedDate: '', amount: undefined, reason: '' }
  error.value = ''
  showForm.value = true
}

function openEdit(row: LoanPenaltyResponse) {
  formMode.value = 'edit'
  editingId.value = row.id
  penaltyForm.value = {
    appliedDate: row.appliedDate,
    amount: row.amount,
    reason: row.reason
  }
  error.value = ''
  showForm.value = true
}

async function onSubmitForm(values: Record<string, any>) {
  submitting.value = true
  error.value = ''
  try {
    const payload: LoanPenaltyRequest = {
      amount: values.amount,
      reason: values.reason,
      appliedDate: values.appliedDate
    }
    if (formMode.value === 'create') {
      await api(`/loans/${loanId}/penalties`, { method: 'POST', body: payload })
      toast.add({ title: t('loans.penalties.toast.added'), color: 'green' })
    } else {
      await api(`/loans/${loanId}/penalties/${editingId.value}`, { method: 'PUT', body: payload })
      toast.add({ title: t('loans.penalties.toast.updated'), color: 'green' })
    }
    showForm.value = false
    await refresh()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    submitting.value = false
  }
}

const confirmDelete = ref<LoanPenaltyResponse | null>(null)
const deleting = ref(false)

async function onConfirmDelete() {
  if (!confirmDelete.value) return
  deleting.value = true
  try {
    await api(`/loans/${loanId}/penalties/${confirmDelete.value.id}`, { method: 'DELETE' })
    toast.add({ title: t('loans.penalties.toast.deleted'), color: 'green' })
    confirmDelete.value = null
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    deleting.value = false
  }
}

async function onMarkPaid(id: number) {
  marking.value = id
  try {
    await api(`/loans/${loanId}/penalties/${id}/pay`, { method: 'PUT' })
    toast.add({ title: t('loans.penalties.toast.markedPaid'), color: 'green' })
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    marking.value = null
  }
}

async function onWaive(id: number) {
  waiving.value = id
  try {
    await api(`/loans/${loanId}/penalties/${id}/waive`, { method: 'PUT' })
    toast.add({ title: t('loans.penalties.toast.waived'), color: 'green' })
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    waiving.value = null
  }
}
</script>
