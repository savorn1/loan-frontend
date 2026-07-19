<template>
  <div>
    <PageHeader title="Loans" :description="totalLabel">
      <template #actions>
        <UButton icon="i-heroicons-plus" @click="openCreate">New Loan</UButton>
      </template>
    </PageHeader>

    <UCard>
      <template #header>
        <div class="flex flex-wrap items-center gap-3">
          <UInput
            v-model="search"
            icon="i-heroicons-magnifying-glass"
            placeholder="Search by customer or purpose..."
            class="max-w-xs w-full sm:w-auto"
          >
            <template v-if="search" #trailing>
              <UButton color="gray" variant="link" icon="i-heroicons-x-mark" :padded="false" @click="search = ''" />
            </template>
          </UInput>
          <USelectMenu v-model="statusFilter" :options="statusOptions" option-attribute="label" value-attribute="value" class="w-40" />
        </div>
      </template>

      <UTable
        :rows="rows"
        :columns="columns"
        :loading="pending"
        v-model:sort="sort"
        @select="(row: LoanResponse) => router.push(`/loans/${row.id}`)"
      >
        <template #status-data="{ row }">
          <StatusBadge :status="row.status" />
        </template>
        <template #principal-data="{ row }">{{ formatCurrency(row.principal) }}</template>
        <template #interestRate-data="{ row }">{{ row.interestRate }}%</template>
        <template #empty-state>
          <EmptyState
            :icon="hasFilters ? 'i-heroicons-magnifying-glass' : 'i-heroicons-banknotes'"
            :title="hasFilters ? 'No matches' : 'No loans yet'"
            :description="hasFilters ? 'Try a different search term or status filter.' : 'Create a loan for one of your customers to get started.'"
          >
            <template v-if="!hasFilters" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">New Loan</UButton>
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
import type { LoanRequest, LoanResponse, LoanStatus } from '~/features/loans/types'

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
  { key: 'id', label: 'ID', sortable: true },
  { key: 'customerName', label: 'Customer', sortable: true },
  { key: 'principal', label: 'Principal', sortable: true },
  { key: 'interestRate', label: 'Rate', sortable: true },
  { key: 'termMonths', label: 'Term (mo)', sortable: true },
  { key: 'status', label: 'Status', sortable: true }
]

const statusOptions: { label: string; value: LoanStatus | '' }[] = [
  { label: 'All statuses', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Closed', value: 'CLOSED' }
]
const statusFilter = ref<LoanStatus | ''>('')

const filteredByStatus = computed(() =>
  statusFilter.value ? (loans.value ?? []).filter(l => l.status === statusFilter.value) : loans.value
)

const { search, page, pageSize, sort, total, rows } = useClientTable(filteredByStatus, {
  searchFields: ['customerName', 'purpose'],
  pageSize: 10
})

const hasFilters = computed(() => !!search.value || !!statusFilter.value)

const totalLabel = computed(() => {
  const count = loans.value?.length ?? 0
  return count === 1 ? '1 loan' : `${count} loans`
})

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
