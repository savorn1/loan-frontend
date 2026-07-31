<template>
  <div>
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">{{ t('loans.penalties.title') }}</span>
          <UButton v-if="isAdmin" size="xs" icon="i-heroicons-plus" @click="openCreate"
            >{{ t('loans.penalties.add') }}</UButton
          >
        </div>
      </template>

      <DataTable :rows="penalties ?? []" :columns="columns" :loading="pending">
        <template #actions-data="{ row }">
          <div class="flex gap-1 justify-end">
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
              <UButton icon="i-heroicons-plus" @click="openCreate">{{ t('loans.penalties.add') }}</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>
    </UCard>

    <UModal v-model="showCreate">
      <UCard>
        <template #header>
          <span class="font-semibold">{{ t('loans.penalties.add') }}</span>
        </template>
        <DynamicForm
          v-model="createForm"
          :fields="fields"
          :loading="creating"
          :error="error"
          :submit-label="t('loans.penalties.submit')"
          cancelable
          @submit="onCreate"
          @cancel="showCreate = false"
        />
      </UCard>
    </UModal>
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
  refresh
} = await useAsyncData(`loan-${loanId}-penalties`, () =>
  api<LoanPenaltyResponse[]>(`/loans/${loanId}/penalties`)
)

const columns = computed<ColumnDef<LoanPenaltyResponse>[]>(() => [
  { key: 'id', label: t('loans.penalties.columns.id') },
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

const showCreate = ref(false)
const creating = ref(false)
const error = ref('')
const marking = ref<number | null>(null)
const waiving = ref<number | null>(null)
const createForm = ref<Record<string, any>>({})

function openCreate() {
  createForm.value = { appliedDate: '', amount: undefined, reason: '' }
  error.value = ''
  showCreate.value = true
}

async function onCreate(values: Record<string, any>) {
  creating.value = true
  error.value = ''
  try {
    const payload: LoanPenaltyRequest = {
      amount: values.amount,
      reason: values.reason,
      appliedDate: values.appliedDate
    }
    await api(`/loans/${loanId}/penalties`, { method: 'POST', body: payload })
    toast.add({ title: t('loans.penalties.toast.added'), color: 'green' })
    showCreate.value = false
    await refresh()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    creating.value = false
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
