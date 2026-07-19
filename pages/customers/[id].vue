<template>
  <div v-if="customer">
    <div class="flex items-center justify-between mb-6">
      <div>
        <UButton to="/customers" variant="link" icon="i-heroicons-arrow-left" size="xs" class="mb-1 px-0">
          Back to customers
        </UButton>
        <h1 class="text-xl font-bold">{{ customer.firstName }} {{ customer.lastName }}</h1>
      </div>
      <UButton v-if="isAdmin" color="red" variant="soft" icon="i-heroicons-trash" @click="confirmDelete = true">
        Delete
      </UButton>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <UCard>
        <template #header>
          <span class="font-semibold">Details</span>
        </template>
        <CustomerForm :initial="customer" :loading="saving" submit-label="Save changes" @submit="onUpdate" />
      </UCard>

      <UCard>
        <template #header>
          <span class="font-semibold">Loans</span>
        </template>
        <UTable :rows="loans ?? []" :columns="loanColumns" :loading="loansPending" @select="(row: LoanResponse) => router.push(`/loans/${row.id}`)">
          <template #status-data="{ row }">
            <StatusBadge :status="row.status" />
          </template>
          <template #principal-data="{ row }">{{ formatCurrency(row.principal) }}</template>
        </UTable>
        <p v-if="!loansPending && (loans ?? []).length === 0" class="text-sm text-gray-500 py-4 text-center">
          No loans for this customer.
        </p>
      </UCard>
    </div>

    <UModal v-model="confirmDelete">
      <UCard>
        <template #header>
          <span class="font-semibold">Delete customer?</span>
        </template>
        <p class="text-sm text-gray-500 mb-4">This action cannot be undone.</p>
        <div class="flex justify-end gap-2">
          <UButton color="gray" variant="ghost" @click="confirmDelete = false">Cancel</UButton>
          <UButton color="red" :loading="deleting" @click="onDelete">Delete</UButton>
        </div>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { CustomerRequest, CustomerResponse } from '~/features/customers/types'
import type { LoanResponse } from '~/features/loans/types'

const route = useRoute()
const router = useRouter()
const api = useApi()
const toast = useToast()
const { isAdmin } = storeToRefs(useAuth())

const customerId = route.params.id as string

const { data: customer, refresh } = await useAsyncData(`customer-${customerId}`, () =>
  api<CustomerResponse>(`/customers/${customerId}`)
)
const { data: loans, pending: loansPending } = await useAsyncData(`customer-${customerId}-loans`, () =>
  api<LoanResponse[]>(`/loans/customer/${customerId}`)
)

const saving = ref(false)
const deleting = ref(false)
const confirmDelete = ref(false)

const loanColumns = [
  { key: 'id', label: 'ID' },
  { key: 'principal', label: 'Principal' },
  { key: 'termMonths', label: 'Term (mo)' },
  { key: 'status', label: 'Status' }
]

async function onUpdate(payload: CustomerRequest) {
  saving.value = true
  try {
    await api(`/customers/${customerId}`, { method: 'PUT', body: payload })
    toast.add({ title: 'Customer updated', color: 'green' })
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    saving.value = false
  }
}

async function onDelete() {
  deleting.value = true
  try {
    await api(`/customers/${customerId}`, { method: 'DELETE' })
    toast.add({ title: 'Customer deleted', color: 'green' })
    await router.push('/customers')
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
    confirmDelete.value = false
  } finally {
    deleting.value = false
  }
}
</script>
