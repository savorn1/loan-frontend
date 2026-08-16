<template>
  <div>
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">{{ t('loans.interest.title') }}</span>
          <UButton v-if="isAdmin" size="xs" icon="i-heroicons-plus" @click="openCreate">{{
            t('loans.interest.addButton')
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
        :rows="interest ?? []"
        :columns="columns"
        :loading="pending"
        numbered
        refreshable
        @refresh="refresh"
      >
        <template #actions-data="{ row }">
          <div v-if="isAdmin" class="flex gap-1 justify-end">
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
          </div>
        </template>
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-chart-bar"
            :title="t('loans.interest.empty.title')"
            :description="t('loans.interest.empty.description')"
          >
            <template v-if="isAdmin" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">{{
                t('loans.interest.addButton')
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
            formMode === 'create'
              ? t('loans.interest.modalTitle')
              : t('loans.interest.editModalTitle')
          }}</span>
        </template>
        <DynamicForm
          v-model="interestForm"
          :fields="fields"
          :loading="submitting"
          :error="error"
          :submit-label="formMode === 'create' ? t('loans.interest.submitLabel') : t('common.save')"
          cancelable
          @submit="onSubmitForm"
          @cancel="showForm = false"
        />
      </UCard>
    </UModal>

    <ConfirmModal
      :model-value="!!confirmDelete"
      :title="t('loans.interest.confirmDelete.title')"
      :description="t('loans.interest.confirmDelete.description')"
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
import type { LoanInterestRequest, LoanInterestResponse } from '~/features/loans/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

const { t } = useI18n()
const route = useRoute()
const api = useApi()
const toast = useToast()
const { isAdmin } = storeToRefs(useAuth())

const loanId = route.params.id as string

const {
  data: interest,
  pending,
  error: fetchError,
  refresh
} = await useAsyncData(`loan-${loanId}-interest`, () =>
  api<LoanInterestResponse[]>(`/loans/${loanId}/interest`)
)

const columns = computed<ColumnDef<LoanInterestResponse>[]>(() => [
  { key: 'periodStart', label: t('loans.interest.columns.periodStart'), type: 'date' },
  { key: 'periodEnd', label: t('loans.interest.columns.periodEnd'), type: 'date' },
  { key: 'rate', label: t('loans.interest.columns.rate'), type: 'percent' },
  { key: 'amount', label: t('loans.interest.columns.amount'), type: 'currency' },
  { key: 'accruedAt', label: t('loans.interest.columns.accrued'), type: 'date' },
  { key: 'createdAt', label: t('loans.interest.columns.created'), type: 'datetime' },
  { key: 'actions', label: '', class: 'text-right' }
])

const fields = computed<FieldDef[]>(() => [
  {
    name: 'periodStart',
    label: t('loans.interest.fields.periodStart'),
    type: 'date',
    required: true,
    wrapper: 'half'
  },
  {
    name: 'periodEnd',
    label: t('loans.interest.fields.periodEnd'),
    type: 'date',
    required: true,
    wrapper: 'half'
  },
  {
    name: 'rate',
    label: t('loans.interest.fields.rate'),
    type: 'number',
    required: true,
    suffix: '%',
    min: 0.01,
    max: 100,
    step: 0.01,
    wrapper: 'half'
  },
  {
    name: 'amount',
    label: t('loans.interest.fields.amount'),
    type: 'currency',
    required: true,
    wrapper: 'half'
  }
])

const showForm = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const editingId = ref<number | null>(null)
const submitting = ref(false)
const error = ref('')
const interestForm = ref<Record<string, any>>({})

function openCreate() {
  formMode.value = 'create'
  editingId.value = null
  interestForm.value = { periodStart: '', periodEnd: '', rate: undefined, amount: undefined }
  error.value = ''
  showForm.value = true
}

function openEdit(row: LoanInterestResponse) {
  formMode.value = 'edit'
  editingId.value = row.id
  interestForm.value = {
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    rate: row.rate,
    amount: row.amount
  }
  error.value = ''
  showForm.value = true
}

async function onSubmitForm(values: Record<string, any>) {
  submitting.value = true
  error.value = ''
  try {
    const payload: LoanInterestRequest = {
      periodStart: values.periodStart,
      periodEnd: values.periodEnd,
      rate: values.rate,
      amount: values.amount
    }
    if (formMode.value === 'create') {
      await api(`/loans/${loanId}/interest`, { method: 'POST', body: payload })
      toast.add({ title: t('loans.interest.toastAdded'), color: 'green' })
    } else {
      await api(`/loans/${loanId}/interest/${editingId.value}`, { method: 'PUT', body: payload })
      toast.add({ title: t('loans.interest.toastUpdated'), color: 'green' })
    }
    showForm.value = false
    await refresh()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    submitting.value = false
  }
}

const confirmDelete = ref<LoanInterestResponse | null>(null)
const deleting = ref(false)

async function onConfirmDelete() {
  if (!confirmDelete.value) return
  deleting.value = true
  try {
    await api(`/loans/${loanId}/interest/${confirmDelete.value.id}`, { method: 'DELETE' })
    toast.add({ title: t('loans.interest.toastDeleted'), color: 'green' })
    confirmDelete.value = null
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    deleting.value = false
  }
}
</script>
