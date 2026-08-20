<template>
  <div>
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">{{ t('loans.restructures.title') }}</span>
          <UButton v-if="isAdmin" size="xs" icon="i-heroicons-plus" @click="openCreate">{{
            t('loans.restructures.add')
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
        :rows="restructures ?? []"
        :columns="columns"
        :loading="pending"
        numbered
        refreshable
        @refresh="refresh"
      >
        <template #actions-data="{ row }">
          <div v-if="isAdmin && row.status === 'PENDING_APPROVAL'" class="flex gap-1 justify-end">
            <UButton
              v-if="row.createdBy !== username"
              size="2xs"
              color="green"
              variant="soft"
              icon="i-heroicons-check"
              :aria-label="t('loans.restructures.actions.approve')"
              @click="confirmApprove = row"
            />
            <UButton
              v-if="row.createdBy !== username"
              size="2xs"
              color="red"
              variant="soft"
              icon="i-heroicons-x-mark"
              :aria-label="t('loans.restructures.actions.reject')"
              @click="openReject(row)"
            />
          </div>
        </template>
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-arrow-path-rounded-square"
            :title="t('loans.restructures.empty.title')"
            :description="t('loans.restructures.empty.description')"
          >
            <template v-if="isAdmin" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">{{
                t('loans.restructures.add')
              }}</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>
    </UCard>

    <UModal v-model="showCreate">
      <UCard>
        <template #header>
          <span class="font-semibold">{{ t('loans.restructures.add') }}</span>
        </template>
        <DynamicForm
          v-model="createForm"
          :fields="fields"
          :loading="creating"
          :error="error"
          :submit-label="t('loans.restructures.submit')"
          cancelable
          @submit="onCreate"
          @cancel="showCreate = false"
        />
      </UCard>
    </UModal>

    <UModal v-model="showReject">
      <UCard>
        <template #header>
          <span class="font-semibold">{{ t('loans.restructures.confirm.reject.title') }}</span>
        </template>
        <DynamicForm
          v-model="rejectForm"
          :fields="rejectFields"
          :loading="rejecting"
          :error="rejectError"
          :submit-label="t('common.confirm')"
          cancelable
          @submit="onSubmitReject"
          @cancel="showReject = false"
        />
      </UCard>
    </UModal>

    <ConfirmModal
      :model-value="!!confirmApprove"
      :title="t('loans.restructures.confirm.approve.title')"
      :description="t('loans.restructures.confirm.approve.description')"
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
import type {
  LoanRestructureRejectRequest,
  LoanRestructureRequest,
  LoanRestructureResponse
} from '~/features/loans/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

const route = useRoute()
const api = useApi()
const toast = useToast()
const { isAdmin, username } = storeToRefs(useAuth())
const { t } = useI18n()
const { formatTermLength } = useTermUnit()

const loanId = route.params.id as string

const {
  data: restructures,
  pending,
  error: fetchError,
  refresh
} = await useAsyncData(`loan-${loanId}-restructures`, () =>
  api<LoanRestructureResponse[]>(`/loans/${loanId}/restructures`)
)

const columns = computed<ColumnDef<LoanRestructureResponse>[]>(() => [
  { key: 'effectiveDate', label: t('loans.restructures.columns.effective'), type: 'date' },
  {
    key: 'newTermMonths',
    label: t('loans.restructures.columns.newTerm'),
    value: (row) => formatTermLength(row.newTermMonths, row.newTermUnit)
  },
  { key: 'newInterestRate', label: t('loans.restructures.columns.newRate'), type: 'percent' },
  { key: 'reason', label: t('loans.restructures.columns.reason') },
  { key: 'status', label: t('loans.restructures.columns.status'), type: 'status' },
  { key: 'createdBy', label: t('loans.restructures.columns.createdBy') },
  { key: 'createdAt', label: t('loans.restructures.columns.created'), type: 'datetime' },
  { key: 'actions', label: '', class: 'text-right' }
])

const fields = computed<FieldDef[]>(() => [
  {
    name: 'newTermMonths',
    label: t('loans.restructures.fields.newTermMonths'),
    type: 'number',
    required: true,
    min: 1,
    max: 3650,
    wrapper: 'half'
  },
  {
    name: 'newTermUnit',
    label: t('loans.restructures.fields.newTermUnit'),
    type: 'select',
    required: true,
    default: 'MONTH',
    wrapper: 'half',
    options: [
      { label: t('loanConfig.termTemplates.units.day'), value: 'DAY' },
      { label: t('loanConfig.termTemplates.units.month'), value: 'MONTH' },
      { label: t('loanConfig.termTemplates.units.year'), value: 'YEAR' }
    ]
  },
  {
    name: 'newInterestRate',
    label: t('loans.restructures.fields.newInterestRate'),
    type: 'number',
    suffix: '%',
    min: 0.01,
    max: 100,
    step: 0.01,
    hint: t('loans.restructures.fields.newInterestRateHint'),
    wrapper: 'half'
  },
  {
    name: 'effectiveDate',
    label: t('loans.restructures.fields.effectiveDate'),
    type: 'date',
    required: true
  },
  { name: 'reason', label: t('loans.restructures.fields.reason'), type: 'textarea', required: true }
])

const showCreate = ref(false)
const creating = ref(false)
const error = ref('')
const createForm = ref<Record<string, any>>({})

function openCreate() {
  createForm.value = {
    newTermMonths: undefined,
    newTermUnit: 'MONTH',
    newInterestRate: undefined,
    effectiveDate: '',
    reason: ''
  }
  error.value = ''
  showCreate.value = true
}

async function onCreate(values: Record<string, any>) {
  creating.value = true
  error.value = ''
  try {
    const payload: LoanRestructureRequest = {
      newTermMonths: values.newTermMonths,
      newTermUnit: values.newTermUnit,
      newInterestRate: values.newInterestRate || undefined,
      effectiveDate: values.effectiveDate,
      reason: values.reason
    }
    await api(`/loans/${loanId}/restructures`, { method: 'POST', body: payload })
    toast.add({ title: t('loans.restructures.toast.recorded'), color: 'green' })
    showCreate.value = false
    await refresh()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    creating.value = false
  }
}

const confirmApprove = ref<LoanRestructureResponse | null>(null)
const approving = ref(false)

async function onConfirmApprove() {
  if (!confirmApprove.value) return
  approving.value = true
  try {
    await api(`/loans/${loanId}/restructures/${confirmApprove.value.id}/approve`, {
      method: 'PUT'
    })
    toast.add({ title: t('loans.restructures.toast.approved'), color: 'green' })
    confirmApprove.value = null
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    approving.value = false
  }
}

const showReject = ref(false)
const rejectTarget = ref<LoanRestructureResponse | null>(null)
const rejectForm = ref<Record<string, any>>({ reason: '' })
const rejecting = ref(false)
const rejectError = ref('')

const rejectFields = computed<FieldDef[]>(() => [
  { name: 'reason', label: t('loans.restructures.fields.reason'), type: 'textarea', required: true }
])

function openReject(row: LoanRestructureResponse) {
  rejectTarget.value = row
  rejectForm.value = { reason: '' }
  rejectError.value = ''
  showReject.value = true
}

async function onSubmitReject(values: Record<string, any>) {
  if (!rejectTarget.value) return
  rejecting.value = true
  rejectError.value = ''
  try {
    const payload: LoanRestructureRejectRequest = { reason: values.reason }
    await api(`/loans/${loanId}/restructures/${rejectTarget.value.id}/reject`, {
      method: 'PUT',
      body: payload
    })
    toast.add({ title: t('loans.restructures.toast.rejected'), color: 'green' })
    showReject.value = false
    await refresh()
  } catch (err) {
    rejectError.value = apiErrorMessage(err)
  } finally {
    rejecting.value = false
  }
}
</script>
