<template>
  <div>
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">{{ t('loans.fees.title') }}</span>
          <UButton v-if="isAdmin" size="xs" icon="i-heroicons-plus" @click="openCreate">{{
            t('loans.fees.addButton')
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

      <DataTable :rows="fees ?? []" :columns="columns" :loading="pending">
        <template #actions-data="{ row }">
          <div class="flex gap-1 justify-end">
            <UButton
              v-if="isAdmin && row.status === 'PENDING'"
              size="2xs"
              variant="soft"
              :loading="marking === row.id"
              @click="onMarkPaid(row.id)"
            >
              {{ t('loans.fees.markPaidButton') }}
            </UButton>
            <UButton
              v-if="isAdmin && row.status === 'PENDING'"
              size="2xs"
              color="gray"
              variant="soft"
              :loading="waiving === row.id"
              @click="onWaive(row.id)"
            >
              {{ t('loans.fees.waiveButton') }}
            </UButton>
          </div>
        </template>
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-receipt-percent"
            :title="t('loans.fees.empty.title')"
            :description="t('loans.fees.empty.description')"
          >
            <template v-if="isAdmin" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">{{
                t('loans.fees.addButton')
              }}</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div
        v-if="totalFees"
        class="pt-4 mt-2 border-t border-gray-200 dark:border-gray-800 text-sm flex justify-between"
      >
        <span class="text-gray-500">{{ t('loans.fees.totalLabel') }}</span>
        <span class="font-semibold">{{ formatCurrency(totalFees) }}</span>
      </div>
    </UCard>

    <UModal v-model="showCreate">
      <UCard>
        <template #header>
          <span class="font-semibold">{{ t('loans.fees.modalTitle') }}</span>
        </template>
        <DynamicForm
          v-model="createForm"
          :fields="fields"
          :loading="creating"
          :error="error"
          :submit-label="t('loans.fees.submitLabel')"
          cancelable
          @submit="onCreate"
          @cancel="showCreate = false"
        />
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { LoanFeeRequest, LoanFeeResponse } from '~/features/loans/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

const { t } = useI18n()
const route = useRoute()
const api = useApi()
const toast = useToast()
const { isAdmin } = storeToRefs(useAuth())

const loanId = route.params.id as string

const {
  data: fees,
  pending,
  error: fetchError,
  refresh
} = await useAsyncData(`loan-${loanId}-fees`, () => api<LoanFeeResponse[]>(`/loans/${loanId}/fees`))

const totalFees = computed(() => (fees.value ?? []).reduce((sum, f) => sum + f.amount, 0))

const columns = computed<ColumnDef<LoanFeeResponse>[]>(() => [
  { key: 'type', label: t('loans.fees.columns.type'), type: 'enum' },
  { key: 'chargedDate', label: t('loans.fees.columns.charged'), type: 'date' },
  { key: 'amount', label: t('loans.fees.columns.amount'), type: 'currency' },
  { key: 'description', label: t('loans.fees.columns.description') },
  { key: 'status', label: t('loans.fees.columns.status'), type: 'status' },
  { key: 'createdAt', label: t('loans.fees.columns.created'), type: 'datetime' },
  { key: 'actions', label: '', class: 'text-right' }
])

const fields = computed<FieldDef[]>(() => [
  {
    name: 'type',
    label: t('loans.fees.fields.type'),
    type: 'select',
    required: true,
    wrapper: 'half',
    options: [
      { label: t('loans.fees.typeOptions.processing'), value: 'PROCESSING' },
      { label: t('loans.fees.typeOptions.insurance'), value: 'INSURANCE' },
      { label: t('loans.fees.typeOptions.administration'), value: 'ADMINISTRATION' },
      { label: t('loans.fees.typeOptions.other'), value: 'OTHER' }
    ]
  },
  {
    name: 'amount',
    label: t('loans.fees.fields.amount'),
    type: 'currency',
    required: true,
    wrapper: 'half'
  },
  {
    name: 'chargedDate',
    label: t('loans.fees.fields.chargedDate'),
    type: 'date',
    required: true
  },
  { name: 'description', label: t('loans.fees.fields.description'), type: 'textarea' }
])

const showCreate = ref(false)
const creating = ref(false)
const error = ref('')
const marking = ref<number | null>(null)
const waiving = ref<number | null>(null)
const createForm = ref<Record<string, any>>({})

function openCreate() {
  createForm.value = { type: undefined, amount: undefined, chargedDate: '', description: '' }
  error.value = ''
  showCreate.value = true
}

async function onCreate(values: Record<string, any>) {
  creating.value = true
  error.value = ''
  try {
    const payload: LoanFeeRequest = {
      type: values.type,
      amount: values.amount,
      chargedDate: values.chargedDate,
      description: values.description || undefined
    }
    await api(`/loans/${loanId}/fees`, { method: 'POST', body: payload })
    toast.add({ title: t('loans.fees.toast.added'), color: 'green' })
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
    await api(`/loans/${loanId}/fees/${id}/pay`, { method: 'PUT' })
    toast.add({ title: t('loans.fees.toast.markedPaid'), color: 'green' })
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
    await api(`/loans/${loanId}/fees/${id}/waive`, { method: 'PUT' })
    toast.add({ title: t('loans.fees.toast.waived'), color: 'green' })
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    waiving.value = null
  }
}
</script>
