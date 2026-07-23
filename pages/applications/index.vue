<template>
  <div>
    <PageHeader title="Loan Applications" :description="totalLabel">
      <template #actions>
        <UButton icon="i-heroicons-plus" @click="openCreate">New Application</UButton>
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
              <UButton
                color="gray"
                variant="link"
                icon="i-heroicons-x-mark"
                :padded="false"
                @click="search = ''"
              />
            </template>
          </UInput>
          <USelectMenu
            v-model="statusFilter"
            :options="statusOptions"
            option-attribute="label"
            value-attribute="value"
            class="w-40"
          />
        </div>
      </template>

      <DataTable
        v-model:sort="sort"
        :rows="rows"
        :columns="columns"
        :loading="pending"
        @select="(row: ApplicationResponse) => router.push(`/applications/${row.id}`)"
      >
        <template #empty-state>
          <EmptyState
            :icon="hasFilters ? 'i-heroicons-magnifying-glass' : 'i-heroicons-document-text'"
            :title="hasFilters ? 'No matches' : 'No applications yet'"
            :description="
              hasFilters
                ? 'Try a different search term or status filter.'
                : 'Submit a loan application for one of your customers to get started.'
            "
          >
            <template v-if="!hasFilters" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">New Application</UButton>
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
          <span class="font-semibold">New Application</span>
        </template>
        <DynamicForm
          v-model="createForm"
          :fields="applicationFields"
          :loading="creating"
          :error="error"
          submit-label="Submit"
          cancelable
          @submit="onCreate"
          @cancel="showCreate = false"
        />
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { CustomerResponse } from '~/features/customers/types'
import type {
  ApplicationRequest,
  ApplicationResponse,
  ApplicationStatus
} from '~/features/loans/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

const api = useApi()
const toast = useToast()
const router = useRouter()

const {
  data: applications,
  pending,
  refresh
} = await useAsyncData('applications', () => api<ApplicationResponse[]>('/loans/applications'))
const { data: customersRaw } = await useAsyncData('applications-customers', () =>
  api<CustomerResponse[]>('/customers')
)

const customerOptions = computed(() =>
  (customersRaw.value ?? []).map((c) => ({
    label: `${c.firstName} ${c.lastName} (#${c.id})`,
    value: c.id
  }))
)

const columns: ColumnDef<ApplicationResponse>[] = [
  { key: 'id', label: 'ID', sortable: true },
  { key: 'customerName', label: 'Customer', sortable: true },
  { key: 'requestedAmount', label: 'Requested', type: 'currency', sortable: true },
  { key: 'requestedTermMonths', label: 'Term (mo)', sortable: true },
  { key: 'status', type: 'status', sortable: true },
  { key: 'submittedAt', label: 'Submitted', type: 'datetime', sortable: true }
]

const statusOptions: { label: string; value: ApplicationStatus | '' }[] = [
  { label: 'All statuses', value: '' },
  { label: 'Submitted', value: 'SUBMITTED' },
  { label: 'Under review', value: 'UNDER_REVIEW' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Withdrawn', value: 'WITHDRAWN' }
]
const statusFilter = ref<ApplicationStatus | ''>('')

const filteredByStatus = computed(() =>
  statusFilter.value
    ? (applications.value ?? []).filter((a) => a.status === statusFilter.value)
    : applications.value
)

const { search, page, pageSize, sort, total, rows } = useClientTable(filteredByStatus, {
  searchFields: ['customerName', 'purpose'],
  pageSize: 10
})

const hasFilters = computed(() => !!search.value || !!statusFilter.value)

const totalLabel = computed(() => {
  const count = applications.value?.length ?? 0
  return count === 1 ? '1 application' : `${count} applications`
})

const showCreate = ref(false)
const creating = ref(false)
const error = ref('')

const applicationFields = computed<FieldDef[]>(() => [
  {
    name: 'customerId',
    label: 'Customer',
    type: 'select',
    required: true,
    options: customerOptions.value,
    placeholder: 'Select a customer'
  },
  {
    name: 'requestedAmount',
    label: 'Requested amount',
    type: 'number',
    required: true,
    prefix: '$',
    min: 1000,
    step: 0.01,
    hint: 'Minimum 1000',
    wrapper: 'half'
  },
  {
    name: 'requestedTermMonths',
    label: 'Requested term (months)',
    type: 'number',
    required: true,
    min: 1,
    max: 360,
    hint: '1 – 360',
    wrapper: 'half'
  },
  { name: 'purpose', type: 'textarea' }
])

const createForm = ref<Record<string, any>>({})

function openCreate() {
  createForm.value = {
    customerId: undefined,
    requestedAmount: 1000,
    requestedTermMonths: 12,
    purpose: ''
  }
  error.value = ''
  showCreate.value = true
}

async function onCreate(values: Record<string, any>) {
  creating.value = true
  error.value = ''
  try {
    const payload: ApplicationRequest = {
      customerId: values.customerId,
      requestedAmount: values.requestedAmount,
      requestedTermMonths: values.requestedTermMonths,
      purpose: values.purpose || undefined
    }
    const created = await api<ApplicationResponse>('/loans/applications', {
      method: 'POST',
      body: payload
    })
    toast.add({ title: 'Application submitted', color: 'green' })
    showCreate.value = false
    await refresh()
    await router.push(`/applications/${created.id}`)
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    creating.value = false
  }
}
</script>
