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

      <DataTable
        :rows="rows"
        :columns="columns"
        :loading="pending"
        v-model:sort="sort"
        @select="onSelect"
      >
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
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>

    <UModal v-model="showCreate">
      <UCard>
        <template #header>
          <span class="font-semibold">New Customer</span>
        </template>
        <CustomerForm :loading="creating" submit-label="Create" cancelable @submit="onCreate" @cancel="showCreate = false" />
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { CustomerRequest, CustomerResponse } from '~/features/customers/types'
import type { ColumnDef } from '~/shared/types'

const api = useApi()
const toast = useToast()
const router = useRouter()

const { data: customers, pending, refresh } = await useAsyncData('customers', () => api<CustomerResponse[]>('/customers'))

const showCreate = ref(false)
const creating = ref(false)

const columns: ColumnDef<CustomerResponse>[] = [
  { key: 'id', label: 'ID', sortable: true },
  { key: 'firstName', sortable: true },
  { key: 'lastName', sortable: true },
  { key: 'email', sortable: true },
  { key: 'phone' },
  { key: 'createdAt', label: 'Created', type: 'datetime', sortable: true }
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
