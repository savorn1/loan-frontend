<template>
  <div v-if="customer">
    <div class="flex items-center justify-between mb-6 gap-4">
      <div class="flex items-center gap-3 min-w-0">
        <div class="flex items-center justify-center w-11 h-11 rounded-full bg-primary-50 dark:bg-primary-400/10 text-primary-600 dark:text-primary-400 font-semibold shrink-0">
          {{ initials }}
        </div>
        <div class="min-w-0">
          <UButton to="/customers" variant="link" icon="i-heroicons-arrow-left" size="xs" class="mb-0.5 px-0">
            Back to customers
          </UButton>
          <h1 class="text-xl font-bold truncate">{{ customer.firstName }} {{ customer.lastName }}</h1>
        </div>
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
          <div class="flex items-center justify-between">
            <span class="font-semibold">Loans</span>
            <UBadge v-if="loans?.length" color="gray" variant="subtle">{{ loans.length }}</UBadge>
          </div>
        </template>
        <UTable :rows="loans ?? []" :columns="loanColumns" :loading="loansPending" @select="(row: LoanResponse) => router.push(`/loans/${row.id}`)">
          <template #status-data="{ row }">
            <StatusBadge :status="row.status" />
          </template>
          <template #principal-data="{ row }">{{ formatCurrency(row.principal) }}</template>
          <template #empty-state>
            <EmptyState icon="i-heroicons-banknotes" title="No loans yet" description="This customer doesn't have any loans on record." />
          </template>
        </UTable>
      </UCard>
    </div>

    <ConfirmModal
      v-model="confirmDelete"
      title="Delete customer?"
      :description="`This permanently removes ${customer.firstName} ${customer.lastName} and cannot be undone.`"
      confirm-label="Delete"
      color="red"
      :loading="deleting"
      @confirm="onDelete"
    />
  </div>
  <div v-else class="flex justify-center py-16">
    <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-gray-400" />
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

const initials = computed(() => {
  if (!customer.value) return ''
  return `${customer.value.firstName.charAt(0)}${customer.value.lastName.charAt(0)}`.toUpperCase()
})

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
