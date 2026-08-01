<template>
  <div>
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">{{ t('loans.interest.title') }}</span>
          <UButton v-if="isAdmin" size="xs" icon="i-heroicons-plus" @click="openCreate"
            >{{ t('loans.interest.addButton') }}</UButton
          >
        </div>
      </template>

      <DataTable :rows="interest ?? []" :columns="columns" :loading="pending">
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

    <UModal v-model="showCreate">
      <UCard>
        <template #header>
          <span class="font-semibold">{{ t('loans.interest.modalTitle') }}</span>
        </template>
        <DynamicForm
          v-model="createForm"
          :fields="fields"
          :loading="creating"
          :error="error"
          :submit-label="t('loans.interest.submitLabel')"
          cancelable
          @submit="onCreate"
          @cancel="showCreate = false"
        />
      </UCard>
    </UModal>
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
  refresh
} = await useAsyncData(`loan-${loanId}-interest`, () =>
  api<LoanInterestResponse[]>(`/loans/${loanId}/interest`)
)

const columns = computed<ColumnDef<LoanInterestResponse>[]>(() => [
  { key: 'id', label: t('loans.interest.columns.id') },
  { key: 'periodStart', label: t('loans.interest.columns.periodStart'), type: 'date' },
  { key: 'periodEnd', label: t('loans.interest.columns.periodEnd'), type: 'date' },
  { key: 'rate', label: t('loans.interest.columns.rate'), type: 'percent' },
  { key: 'amount', label: t('loans.interest.columns.amount'), type: 'currency' },
  { key: 'accruedAt', label: t('loans.interest.columns.accrued'), type: 'date' },
  { key: 'createdAt', label: t('loans.interest.columns.created'), type: 'datetime' }
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

const showCreate = ref(false)
const creating = ref(false)
const error = ref('')
const createForm = ref<Record<string, any>>({})

function openCreate() {
  createForm.value = { periodStart: '', periodEnd: '', rate: undefined, amount: undefined }
  error.value = ''
  showCreate.value = true
}

async function onCreate(values: Record<string, any>) {
  creating.value = true
  error.value = ''
  try {
    const payload: LoanInterestRequest = {
      periodStart: values.periodStart,
      periodEnd: values.periodEnd,
      rate: values.rate,
      amount: values.amount
    }
    await api(`/loans/${loanId}/interest`, { method: 'POST', body: payload })
    toast.add({ title: t('loans.interest.toastAdded'), color: 'green' })
    showCreate.value = false
    await refresh()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    creating.value = false
  }
}
</script>
