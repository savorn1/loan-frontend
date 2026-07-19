<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-xl font-bold">Loans</h1>
      <UButton icon="i-heroicons-plus" @click="openCreate">New Loan</UButton>
    </div>

    <UCard>
      <UTable :rows="loans ?? []" :columns="columns" :loading="pending" @select="(row: LoanResponse) => router.push(`/loans/${row.id}`)">
        <template #status-data="{ row }">
          <StatusBadge :status="row.status" />
        </template>
        <template #principal-data="{ row }">{{ formatCurrency(row.principal) }}</template>
        <template #interestRate-data="{ row }">{{ row.interestRate }}%</template>
      </UTable>
      <p v-if="!pending && (loans ?? []).length === 0" class="text-sm text-gray-500 py-4 text-center">
        No loans yet.
      </p>
    </UCard>

    <UModal v-model="showCreate">
      <UCard>
        <template #header>
          <span class="font-semibold">New Loan</span>
        </template>
        <UForm :state="form" class="space-y-4" @submit="onCreate">
          <UFormGroup label="Customer" name="customerId" required>
            <USelectMenu
              v-model="selectedCustomer"
              :options="customers ?? []"
              option-attribute="label"
              searchable
              placeholder="Select a customer"
            />
          </UFormGroup>
          <div class="grid grid-cols-2 gap-4">
            <UFormGroup label="Principal" name="principal" required help="Minimum 1000">
              <UInput v-model.number="form.principal" type="number" min="1000" step="0.01" required />
            </UFormGroup>
            <UFormGroup label="Interest rate (%)" name="interestRate" required help="0.01 – 100">
              <UInput v-model.number="form.interestRate" type="number" min="0.01" max="100" step="0.01" required />
            </UFormGroup>
          </div>
          <UFormGroup label="Term (months)" name="termMonths" required help="1 – 360">
            <UInput v-model.number="form.termMonths" type="number" min="1" max="360" required />
          </UFormGroup>
          <UFormGroup label="Purpose" name="purpose">
            <UTextarea v-model="form.purpose" />
          </UFormGroup>
          <UAlert v-if="error" color="red" variant="subtle" :title="error" />
          <div class="flex justify-end">
            <UButton type="submit" :loading="creating">Create</UButton>
          </div>
        </UForm>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { CustomerResponse } from '~/features/customers/types'
import type { LoanRequest, LoanResponse } from '~/features/loans/types'

const api = useApi()
const toast = useToast()
const router = useRouter()

const { data: loans, pending, refresh } = await useAsyncData('loans', () => api<LoanResponse[]>('/loans'))
const { data: customersRaw } = await useAsyncData('loans-customers', () => api<CustomerResponse[]>('/customers'))

const customers = computed(() =>
  (customersRaw.value ?? []).map(c => ({ label: `${c.firstName} ${c.lastName} (#${c.id})`, value: c.id }))
)
const selectedCustomer = ref<{ label: string; value: number } | undefined>(undefined)

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'customerName', label: 'Customer' },
  { key: 'principal', label: 'Principal' },
  { key: 'interestRate', label: 'Rate' },
  { key: 'termMonths', label: 'Term (mo)' },
  { key: 'status', label: 'Status' }
]

const showCreate = ref(false)
const creating = ref(false)
const error = ref('')

const form = reactive({
  principal: 1000,
  interestRate: 5,
  termMonths: 12,
  purpose: ''
})

function openCreate() {
  selectedCustomer.value = undefined
  error.value = ''
  showCreate.value = true
}

async function onCreate() {
  if (!selectedCustomer.value) {
    error.value = 'Please select a customer'
    return
  }
  creating.value = true
  error.value = ''
  try {
    const payload: LoanRequest = {
      customerId: selectedCustomer.value.value,
      principal: form.principal,
      interestRate: form.interestRate,
      termMonths: form.termMonths,
      purpose: form.purpose || undefined
    }
    const created = await api<LoanResponse>('/loans', { method: 'POST', body: payload })
    toast.add({ title: 'Loan created', color: 'green' })
    showCreate.value = false
    await refresh()
    await router.push(`/loans/${created.id}`)
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    creating.value = false
  }
}
</script>
