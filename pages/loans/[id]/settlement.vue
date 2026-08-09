<template>
  <div>
    <UAlert
      v-if="fetchError"
      color="red"
      variant="subtle"
      class="mb-4"
      :title="apiErrorMessage(fetchError)"
    />

    <UCard v-if="settlement">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">{{ t('loans.settlement.title') }}</span>
          <StatusBadge :status="settlement.status" />
        </div>
      </template>

      <dl class="grid grid-cols-2 gap-y-3 text-sm mb-4">
        <dt class="text-gray-500">{{ t('loans.settlement.labels.amount') }}</dt>
        <dd class="font-semibold">{{ formatCurrency(settlement.settlementAmount) }}</dd>
        <dt class="text-gray-500">{{ t('loans.settlement.labels.date') }}</dt>
        <dd>{{ formatDate(settlement.settlementDate) }}</dd>
        <dt class="text-gray-500">{{ t('loans.settlement.labels.note') }}</dt>
        <dd>{{ settlement.note || '—' }}</dd>
      </dl>

      <UButton
        v-if="isAdmin && settlement.status === 'PENDING'"
        :loading="completing"
        @click="showCompleteConfirm = true"
      >
        {{ t('loans.settlement.markCompleted') }}
      </UButton>
    </UCard>

    <UCard v-else>
      <template #header>
        <span class="font-semibold">{{ t('loans.settlement.settleTitle') }}</span>
      </template>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
        {{ t('loans.settlement.noSettlement') }}
      </p>
      <DynamicForm
        v-if="isAdmin"
        v-model="createForm"
        :fields="fields"
        :loading="creating"
        :error="error"
        :submit-label="t('loans.settlement.submit')"
        @submit="onCreate"
      />
    </UCard>

    <ConfirmModal
      v-model="showCompleteConfirm"
      :title="t('loans.settlement.confirmComplete.title')"
      :description="t('loans.settlement.confirmComplete.description')"
      :confirm-label="t('loans.settlement.markCompleted')"
      color="primary"
      :loading="completing"
      @confirm="onComplete"
    />
  </div>
</template>

<script setup lang="ts">
import type { LoanSettlementRequest, LoanSettlementResponse } from '~/features/loans/types'
import type { FieldDef } from '~/shared/types'

const route = useRoute()
const api = useApi()
const toast = useToast()
const { isAdmin } = storeToRefs(useAuth())
const { t } = useI18n()

const loanId = route.params.id as string

const {
  data: settlement,
  error: fetchError,
  refresh
} = await useAsyncData(`loan-${loanId}-settlement`, async () => {
  try {
    return await api<LoanSettlementResponse>(`/loans/${loanId}/settlement`)
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status
    if (status === 404) return null
    throw err
  }
})

const today = new Date().toISOString().slice(0, 10)

const fields = computed<FieldDef[]>(() => [
  {
    name: 'settlementAmount',
    label: t('loans.settlement.fields.settlementAmount'),
    type: 'currency',
    required: true
  },
  {
    name: 'settlementDate',
    label: t('loans.settlement.fields.settlementDate'),
    type: 'date',
    required: true,
    default: today
  },
  { name: 'note', label: t('loans.settlement.fields.note'), type: 'textarea' }
])

const creating = ref(false)
const completing = ref(false)
const showCompleteConfirm = ref(false)
const error = ref('')
const createForm = ref<Record<string, any>>({
  settlementAmount: undefined,
  settlementDate: today,
  note: ''
})

async function onCreate(values: Record<string, any>) {
  creating.value = true
  error.value = ''
  try {
    const payload: LoanSettlementRequest = {
      settlementAmount: values.settlementAmount,
      settlementDate: values.settlementDate,
      note: values.note || undefined
    }
    await api(`/loans/${loanId}/settlement`, { method: 'POST', body: payload })
    toast.add({ title: t('loans.settlement.toast.recorded'), color: 'green' })
    await refresh()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    creating.value = false
  }
}

async function onComplete() {
  completing.value = true
  try {
    await api(`/loans/${loanId}/settlement/complete`, { method: 'PUT' })
    toast.add({ title: t('loans.settlement.toast.completed'), color: 'green' })
    showCompleteConfirm.value = false
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    completing.value = false
  }
}
</script>
