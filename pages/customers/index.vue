<template>
  <div>
    <PageHeader title="Customers" :description="totalLabel">
      <template #actions>
        <UButton icon="i-heroicons-plus" @click="showCreate = true">New Customer</UButton>
      </template>
    </PageHeader>

    <UCard>
      <template #header>
        <UInput
          v-model="search"
          icon="i-heroicons-magnifying-glass"
          placeholder="Search by name or email..."
          class="max-w-xs"
          :ui="{ icon: { trailing: { pointer: '' } } }"
        >
          <template v-if="search" #trailing>
            <UButton color="gray" variant="link" icon="i-heroicons-x-mark" :padded="false" @click="search = ''" />
          </template>
        </UInput>
      </template>

      <UTable
        :rows="rows"
        :columns="columns"
        :loading="pending"
        v-model:sort="sort"
        @select="onSelect"
      >
        <template #createdAt-data="{ row }">{{ formatDate(row.createdAt) }}</template>
        <template #empty-state>
          <EmptyState
            :icon="search ? 'i-heroicons-magnifying-glass' : 'i-heroicons-users'"
            :title="search ? 'No matches' : 'No customers yet'"
            :description="search ? `Nothing matches “${search}”.` : 'Add your first customer to start creating loans for them.'"
          >
            <template v-if="!search" #action>
              <UButton icon="i-heroicons-plus" @click="showCreate = true">New Customer</UButton>
            </template>
          </EmptyState>
        </template>
      </UTable>

      <div v-if="total > pageSize" class="flex justify-end pt-4">
        <UPagination v-model="page" :page-count="pageSize" :total="total" />
      </div>
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
  { key: 'id', label: 'ID', sortable: true },
  { key: 'firstName', label: 'First name', sortable: true },
  { key: 'lastName', label: 'Last name', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'phone', label: 'Phone' },
  { key: 'createdAt', label: 'Created', sortable: true }
]

const { search, page, pageSize, sort, total, rows } = useClientTable(customers, {
  searchFields: ['firstName', 'lastName', 'email'],
  pageSize: 10
})

const totalLabel = computed(() => {
  const count = customers.value?.length ?? 0
  return count === 1 ? '1 customer' : `${count} customers`
})

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
