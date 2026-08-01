<template>
  <div>
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">{{ t('loans.disbursements.title') }}</span>
          <UButton v-if="isAdmin" size="xs" icon="i-heroicons-plus" @click="openCreate"
            >{{ t('loans.disbursements.addButton') }}</UButton
          >
        </div>
      </template>

      <DataTable :rows="disbursements ?? []" :columns="columns" :loading="pending">
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
        v-if="totalDisbursed"
        class="pt-4 mt-2 border-t border-gray-200 dark:border-gray-800 text-sm flex justify-between"
      >
        <span class="text-gray-500">{{ t('loans.disbursements.totalLabel') }}</span>
        <span class="font-semibold">{{ formatCurrency(totalDisbursed) }}</span>
      </div>
    </UCard>

    <UModal v-model="showCreate">
      <UCard>
        <template #header>
          <span class="font-semibold">{{ t('loans.disbursements.modalTitle') }}</span>
        </template>
        <DynamicForm
          v-model="createForm"
          :fields="fields"
          :loading="creating"
          :error="error"
          :submit-label="t('loans.disbursements.submitLabel')"
          cancelable
          @submit="onCreate"
          @cancel="showCreate = false"
        />
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { LoanDisbursementRequest, LoanDisbursementResponse } from '~/features/loans/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

const { t } = useI18n()
const route = useRoute()
const api = useApi()
const toast = useToast()
const { isAdmin } = storeToRefs(useAuth())

const loanId = route.params.id as string

const {
  data: disbursements,
  pending,
  refresh
} = await useAsyncData(`loan-${loanId}-disbursements`, () =>
  api<LoanDisbursementResponse[]>(`/loans/${loanId}/disbursements`)
)

const totalDisbursed = computed(() =>
  (disbursements.value ?? []).reduce((sum, d) => sum + d.amount, 0)
)

const columns = computed<ColumnDef<LoanDisbursementResponse>[]>(() => [
  { key: 'disbursedDate', label: t('loans.disbursements.columns.date'), type: 'date' },
  { key: 'amount', label: t('loans.disbursements.columns.amount'), type: 'currency' },
  { key: 'method', label: t('loans.disbursements.columns.method'), type: 'enum' },
  { key: 'reference', label: t('loans.disbursements.columns.reference') },
  { key: 'createdAt', label: t('loans.disbursements.columns.created'), type: 'datetime' }
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

const showCreate = ref(false)
const creating = ref(false)
const error = ref('')
const createForm = ref<Record<string, any>>({})

function openCreate() {
  createForm.value = { amount: undefined, disbursedDate: '', method: undefined, reference: '' }
  error.value = ''
  showCreate.value = true
}

async function onCreate(values: Record<string, any>) {
  creating.value = true
  error.value = ''
  try {
    const payload: LoanDisbursementRequest = {
      amount: values.amount,
      disbursedDate: values.disbursedDate,
      method: values.method,
      reference: values.reference || undefined
    }
    await api(`/loans/${loanId}/disbursements`, { method: 'POST', body: payload })
    toast.add({ title: t('loans.disbursements.toastRecorded'), color: 'green' })
    showCreate.value = false
    await refresh()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    creating.value = false
  }
}
</script>
