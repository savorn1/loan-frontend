<template>
  <div>
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">{{ t('loans.disbursements.title') }}</span>
          <UButton v-if="isAdmin" size="xs" icon="i-heroicons-plus" @click="openCreate">{{
            t('loans.disbursements.addButton')
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

      <DataTable :rows="disbursements ?? []" :columns="columns" :loading="pending" numbered>
        <template #actions-data="{ row }">
          <div v-if="isAdmin" class="flex gap-1 justify-end">
            <template v-if="row.status === 'PENDING_APPROVAL'">
              <UButton
                size="2xs"
                variant="soft"
                icon="i-heroicons-pencil"
                :aria-label="t('common.edit')"
                @click="openEdit(row)"
              />
              <UButton
                size="2xs"
                color="red"
                variant="soft"
                icon="i-heroicons-trash"
                :aria-label="t('common.delete')"
                @click="confirmDelete = row"
              />
              <UButton
                v-if="row.createdBy !== username"
                size="2xs"
                color="green"
                variant="soft"
                icon="i-heroicons-check"
                :aria-label="t('loans.disbursements.actions.approve')"
                @click="confirmApprove = row"
              />
              <UButton
                v-if="row.createdBy !== username"
                size="2xs"
                color="red"
                variant="soft"
                icon="i-heroicons-x-mark"
                :aria-label="t('loans.disbursements.actions.reject')"
                @click="openReason('reject', row)"
              />
            </template>
            <UButton
              v-else-if="row.status === 'APPROVED'"
              size="2xs"
              color="orange"
              variant="soft"
              icon="i-heroicons-arrow-uturn-left"
              :aria-label="t('loans.disbursements.actions.void')"
              @click="openReason('void', row)"
            />
          </div>
        </template>
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-arrow-down-tray"
            :title="t('loans.disbursements.empty.title')"
            :description="t('loans.disbursements.empty.description')"
          >
            <template v-if="isAdmin" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">{{
                t('loans.disbursements.addButton')
              }}</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div
        v-if="totalDisbursed || totalPending"
        class="pt-4 mt-2 border-t border-gray-200 dark:border-gray-800 text-sm space-y-1"
      >
        <div class="flex justify-between">
          <span class="text-gray-500">{{ t('loans.disbursements.totalLabel') }}</span>
          <span class="font-semibold">{{ formatCurrency(totalDisbursed) }}</span>
        </div>
        <div v-if="totalPending" class="flex justify-between">
          <span class="text-gray-500">{{ t('loans.disbursements.totalPendingLabel') }}</span>
          <span class="font-medium text-orange-500">{{ formatCurrency(totalPending) }}</span>
        </div>
      </div>
    </UCard>

    <UModal v-model="showForm">
      <UCard>
        <template #header>
          <span class="font-semibold">{{
            formMode === 'create'
              ? t('loans.disbursements.modalTitle')
              : t('loans.disbursements.editModalTitle')
          }}</span>
        </template>
        <DynamicForm
          v-model="disbursementForm"
          :fields="fields"
          :loading="submitting"
          :error="error"
          :submit-label="
            formMode === 'create' ? t('loans.disbursements.submitLabel') : t('common.save')
          "
          cancelable
          @submit="onSubmitForm"
          @cancel="showForm = false"
        />
      </UCard>
    </UModal>

    <UModal v-model="showReason">
      <UCard>
        <template #header>
          <span class="font-semibold">{{
            reasonMode === 'reject'
              ? t('loans.disbursements.confirm.reject.title')
              : t('loans.disbursements.confirm.void.title')
          }}</span>
        </template>
        <DynamicForm
          v-model="reasonForm"
          :fields="reasonFields"
          :loading="submittingReason"
          :error="reasonError"
          :submit-label="t('common.confirm')"
          cancelable
          @submit="onSubmitReason"
          @cancel="showReason = false"
        />
      </UCard>
    </UModal>

    <ConfirmModal
      :model-value="!!confirmDelete"
      :title="t('loans.disbursements.confirm.delete.title')"
      :description="t('loans.disbursements.confirm.delete.description')"
      color="red"
      :loading="deleting"
      @update:model-value="
        (v: boolean) => {
          if (!v) confirmDelete = null
        }
      "
      @confirm="onConfirmDelete"
    />

    <ConfirmModal
      :model-value="!!confirmApprove"
      :title="t('loans.disbursements.confirm.approve.title')"
      :description="t('loans.disbursements.confirm.approve.description')"
      color="green"
      :loading="approving"
      @update:model-value="
        (v: boolean) => {
          if (!v) confirmApprove = null
        }
      "
      @confirm="onConfirmApprove"
    />
  </div>
</template>

<script setup lang="ts">
import type { LoanDisbursementRequest, LoanDisbursementResponse } from '~/features/loans/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

const { t } = useI18n()
const route = useRoute()
const api = useApi()
const toast = useToast()
const { isAdmin, username } = storeToRefs(useAuth())

const loanId = route.params.id as string

const {
  data: disbursements,
  pending,
  error: fetchError,
  refresh
} = await useAsyncData(`loan-${loanId}-disbursements`, () =>
  api<LoanDisbursementResponse[]>(`/loans/${loanId}/disbursements`)
)

const totalDisbursed = computed(() =>
  (disbursements.value ?? [])
    .filter((d) => d.status === 'APPROVED')
    .reduce((sum, d) => sum + d.amount, 0)
)

const totalPending = computed(() =>
  (disbursements.value ?? [])
    .filter((d) => d.status === 'PENDING_APPROVAL')
    .reduce((sum, d) => sum + d.amount, 0)
)

const columns = computed<ColumnDef<LoanDisbursementResponse>[]>(() => [
  { key: 'disbursementNo', label: t('loans.disbursements.columns.disbursementNo') },
  { key: 'disbursedDate', label: t('loans.disbursements.columns.date'), type: 'date' },
  { key: 'amount', label: t('loans.disbursements.columns.amount'), type: 'currency' },
  { key: 'method', label: t('loans.disbursements.columns.method'), type: 'enum' },
  { key: 'reference', label: t('loans.disbursements.columns.reference') },
  { key: 'status', label: t('loans.disbursements.columns.status'), type: 'status' },
  { key: 'createdBy', label: t('loans.disbursements.columns.createdBy') },
  {
    key: 'reason',
    label: t('loans.disbursements.columns.reason'),
    value: (row) => row.rejectionReason ?? row.voidReason
  },
  { key: 'actions', label: '', class: 'text-right' }
])

const fields = computed<FieldDef[]>(() => [
  {
    name: 'amount',
    label: t('loans.disbursements.fields.amount'),
    type: 'currency',
    required: true,
    wrapper: 'half'
  },
  {
    name: 'disbursedDate',
    label: t('loans.disbursements.fields.date'),
    type: 'date',
    required: true,
    wrapper: 'half'
  },
  {
    name: 'method',
    label: t('loans.disbursements.fields.method'),
    type: 'select',
    required: true,
    wrapper: 'half',
    options: [
      { label: t('loans.disbursements.methodOptions.bankTransfer'), value: 'BANK_TRANSFER' },
      { label: t('loans.disbursements.methodOptions.cash'), value: 'CASH' },
      { label: t('loans.disbursements.methodOptions.cheque'), value: 'CHEQUE' },
      { label: t('loans.disbursements.methodOptions.mobileWallet'), value: 'MOBILE_WALLET' }
    ]
  },
  { name: 'reference', label: t('loans.disbursements.fields.reference'), wrapper: 'half' }
])

const reasonFields = computed<FieldDef[]>(() => [
  {
    name: 'reason',
    label: t('loans.disbursements.fields.reason'),
    type: 'textarea',
    required: true
  }
])

const showForm = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const editingId = ref<number | null>(null)
const submitting = ref(false)
const error = ref('')
const disbursementForm = ref<Record<string, any>>({})

function openCreate() {
  formMode.value = 'create'
  editingId.value = null
  disbursementForm.value = {
    amount: undefined,
    disbursedDate: '',
    method: undefined,
    reference: ''
  }
  error.value = ''
  showForm.value = true
}

function openEdit(row: LoanDisbursementResponse) {
  formMode.value = 'edit'
  editingId.value = row.id
  disbursementForm.value = {
    amount: row.amount,
    disbursedDate: row.disbursedDate,
    method: row.method,
    reference: row.reference ?? ''
  }
  error.value = ''
  showForm.value = true
}

async function onSubmitForm(values: Record<string, any>) {
  submitting.value = true
  error.value = ''
  try {
    const payload: LoanDisbursementRequest = {
      amount: values.amount,
      disbursedDate: values.disbursedDate,
      method: values.method,
      reference: values.reference || undefined
    }
    if (formMode.value === 'create') {
      await api(`/loans/${loanId}/disbursements`, { method: 'POST', body: payload })
      toast.add({ title: t('loans.disbursements.toastRecorded'), color: 'green' })
    } else {
      await api(`/loans/${loanId}/disbursements/${editingId.value}`, {
        method: 'PUT',
        body: payload
      })
      toast.add({ title: t('loans.disbursements.toastUpdated'), color: 'green' })
    }
    showForm.value = false
    await refresh()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    submitting.value = false
  }
}

const confirmDelete = ref<LoanDisbursementResponse | null>(null)
const deleting = ref(false)

async function onConfirmDelete() {
  if (!confirmDelete.value) return
  deleting.value = true
  try {
    await api(`/loans/${loanId}/disbursements/${confirmDelete.value.id}`, { method: 'DELETE' })
    toast.add({ title: t('loans.disbursements.toastDeleted'), color: 'green' })
    confirmDelete.value = null
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    deleting.value = false
  }
}

const confirmApprove = ref<LoanDisbursementResponse | null>(null)
const approving = ref(false)

async function onConfirmApprove() {
  if (!confirmApprove.value) return
  approving.value = true
  try {
    await api(`/loans/${loanId}/disbursements/${confirmApprove.value.id}/approve`, {
      method: 'PUT'
    })
    toast.add({ title: t('loans.disbursements.toastApproved'), color: 'green' })
    confirmApprove.value = null
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    approving.value = false
  }
}

const showReason = ref(false)
const reasonMode = ref<'reject' | 'void' | null>(null)
const reasonTarget = ref<LoanDisbursementResponse | null>(null)
const reasonForm = ref<Record<string, any>>({ reason: '' })
const submittingReason = ref(false)
const reasonError = ref('')

function openReason(mode: 'reject' | 'void', row: LoanDisbursementResponse) {
  reasonMode.value = mode
  reasonTarget.value = row
  reasonForm.value = { reason: '' }
  reasonError.value = ''
  showReason.value = true
}

async function onSubmitReason(values: Record<string, any>) {
  if (!reasonTarget.value || !reasonMode.value) return
  submittingReason.value = true
  reasonError.value = ''
  try {
    await api(`/loans/${loanId}/disbursements/${reasonTarget.value.id}/${reasonMode.value}`, {
      method: 'PUT',
      body: { reason: values.reason }
    })
    toast.add({
      title:
        reasonMode.value === 'reject'
          ? t('loans.disbursements.toastRejected')
          : t('loans.disbursements.toastVoided'),
      color: 'green'
    })
    showReason.value = false
    await refresh()
  } catch (err) {
    reasonError.value = apiErrorMessage(err)
  } finally {
    submittingReason.value = false
  }
}
</script>
