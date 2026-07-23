<template>
  <div>
    <UCard v-if="writeoff">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">Write-off</span>
          <StatusBadge :status="writeoff.status" />
        </div>
      </template>

      <dl class="grid grid-cols-2 gap-y-3 text-sm mb-4">
        <dt class="text-gray-500">Amount</dt>
        <dd class="font-semibold">{{ formatCurrency(writeoff.amount) }}</dd>
        <dt class="text-gray-500">Write-off date</dt>
        <dd>{{ formatDate(writeoff.writeoffDate) }}</dd>
        <dt class="text-gray-500">Reason</dt>
        <dd>{{ writeoff.reason }}</dd>
      </dl>

      <UButton
        v-if="isAdmin && writeoff.status === 'PENDING'"
        color="red"
        :loading="completing"
        @click="onComplete"
      >
        Mark completed
      </UButton>
    </UCard>

    <UCard v-else>
      <template #header>
        <span class="font-semibold">Write off this loan</span>
      </template>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
        No write-off has been recorded for this loan yet.
      </p>
      <DynamicForm
        v-if="isAdmin"
        v-model="createForm"
        :fields="fields"
        :loading="creating"
        :error="error"
        submit-label="Record write-off"
        @submit="onCreate"
      />
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { LoanWriteoffRequest, LoanWriteoffResponse } from '~/features/loans/types'
import type { FieldDef } from '~/shared/types'

const route = useRoute()
const api = useApi()
const toast = useToast()
const { isAdmin } = storeToRefs(useAuth())

const loanId = route.params.id as string

const { data: writeoff, refresh } = await useAsyncData(`loan-${loanId}-writeoff`, async () => {
  try {
    return await api<LoanWriteoffResponse>(`/loans/${loanId}/writeoff`)
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status
    if (status === 404) return null
    throw err
  }
})

const today = new Date().toISOString().slice(0, 10)

const fields: FieldDef[] = [
  { name: 'amount', type: 'number', required: true, prefix: '$', min: 0.01, step: 0.01 },
  { name: 'writeoffDate', label: 'Write-off date', type: 'date', required: true, default: today },
  { name: 'reason', type: 'textarea', required: true }
]

const creating = ref(false)
const completing = ref(false)
const error = ref('')
const createForm = ref<Record<string, any>>({ amount: undefined, writeoffDate: today, reason: '' })

async function onCreate(values: Record<string, any>) {
  creating.value = true
  error.value = ''
  try {
    const payload: LoanWriteoffRequest = {
      amount: values.amount,
      writeoffDate: values.writeoffDate,
      reason: values.reason
    }
    await api(`/loans/${loanId}/writeoff`, { method: 'POST', body: payload })
    toast.add({ title: 'Write-off recorded', color: 'green' })
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
    await api(`/loans/${loanId}/writeoff/complete`, { method: 'PUT' })
    toast.add({ title: 'Write-off completed', color: 'green' })
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    completing.value = false
  }
}
</script>
