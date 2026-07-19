<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-xl font-bold">Customers</h1>
      <UButton icon="i-heroicons-plus" @click="showCreate = true">New Customer</UButton>
    </div>

    <UCard>
      <UTable :rows="customers ?? []" :columns="columns" :loading="pending" @select="onSelect">
        <template #createdAt-data="{ row }">{{ formatDate(row.createdAt) }}</template>
      </UTable>
      <p v-if="!pending && (customers ?? []).length === 0" class="text-sm text-gray-500 py-4 text-center">
        No customers yet.
      </p>
    </UCard>

    <UModal v-model="showCreate">
      <UCard>
        <template #header>
          <span class="font-semibold">New Customer</span>
        </template>
        <CustomerForm :loading="creating" submit-label="Create" @submit="onCreate" />
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { CustomerRequest, CustomerResponse } from '~/features/customers/types'

const api = useApi()
const toast = useToast()
const router = useRouter()

const { data: customers, pending, refresh } = await useAsyncData('customers', () => api<CustomerResponse[]>('/customers'))

const showCreate = ref(false)
const creating = ref(false)

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'firstName', label: 'First name' },
  { key: 'lastName', label: 'Last name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'createdAt', label: 'Created' }
]

function onSelect(row: CustomerResponse) {
  router.push(`/customers/${row.id}`)
}

async function onCreate(payload: CustomerRequest) {
  creating.value = true
  try {
    await api('/customers', { method: 'POST', body: payload })
    toast.add({ title: 'Customer created', color: 'green' })
    showCreate.value = false
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    creating.value = false
  }
}
</script>
