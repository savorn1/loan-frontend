<template>
  <div>
    <UCard v-if="settlement">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">Settlement</span>
          <StatusBadge :status="settlement.status" />
        </div>
      </template>

      <dl class="grid grid-cols-2 gap-y-3 text-sm mb-4">
        <dt class="text-gray-500">Settlement amount</dt>
        <dd class="font-semibold">{{ formatCurrency(settlement.settlementAmount) }}</dd>
        <dt class="text-gray-500">Settlement date</dt>
        <dd>{{ formatDate(settlement.settlementDate) }}</dd>
        <dt class="text-gray-500">Note</dt>
        <dd>{{ settlement.note || '—' }}</dd>
      </dl>

      <UButton
        v-if="isAdmin && settlement.status === 'PENDING'"
        :loading="completing"
        @click="onComplete"
      >
        Mark completed
      </UButton>
    </UCard>

    <UCard v-else>
      <template #header>
        <span class="font-semibold">Settle this loan</span>
      </template>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
        No settlement has been recorded for this loan yet.
      </p>
      <DynamicForm
        v-if="isAdmin"
        v-model="createForm"
        :fields="fields"
        :loading="creating"
        :error="error"
        submit-label="Record settlement"
        @submit="onCreate"
      />
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { LoanSettlementRequest, LoanSettlementResponse } from '~/features/loans/types'
import type { FieldDef } from '~/shared/types'

const route = useRoute()
const api = useApi()
const toast = useToast()
const { isAdmin } = storeToRefs(useAuth())

const loanId = route.params.id as string

const { data: settlement, refresh } = await useAsyncData(`loan-${loanId}-settlement`, async () => {
  try {
    return await api<LoanSettlementResponse>(`/loans/${loanId}/settlement`)
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status
    if (status === 404) return null
    throw err
  }
})

const today = new Date().toISOString().slice(0, 10)

const fields: FieldDef[] = [
  {
    name: 'settlementAmount',
    label: 'Settlement amount',
    type: 'number',
    required: true,
    prefix: '$',
    min: 0.01,
    step: 0.01
  },
  {
    name: 'settlementDate',
    label: 'Settlement date',
    type: 'date',
    required: true,
    default: today
  },
  { name: 'note', type: 'textarea' }
]

const creating = ref(false)
const completing = ref(false)
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
    toast.add({ title: 'Settlement recorded', color: 'green' })
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
    toast.add({ title: 'Settlement completed', color: 'green' })
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    completing.value = false
  }
}
</script>
