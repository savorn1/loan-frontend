<template>
  <div>
    <PageHeader :title="t('customers.list.title')" :description="totalLabel">
      <template #actions>
        <UButton icon="i-heroicons-plus" @click="showCreate = true">{{
          t('customers.list.newCustomer')
        }}</UButton>
      </template>
    </PageHeader>

    <UCard>
      <template #header>
        <div class="flex flex-wrap items-center gap-3">
          <UInput
            v-model="search"
            icon="i-heroicons-magnifying-glass"
            :placeholder="t('customers.list.searchPlaceholder')"
            class="max-w-xs"
            :ui="{ icon: { trailing: { pointer: '' } } }"
          >
            <template v-if="search" #trailing>
              <UButton
                color="gray"
                variant="link"
                icon="i-heroicons-x-mark"
                :aria-label="t('common.clearSearch')"
                :padded="false"
                @click="search = ''"
              />
            </template>
          </UInput>
          <USelectMenu
            v-model="branchFilter"
            :options="branchFilterOptions"
            option-attribute="label"
            value-attribute="value"
            class="w-48"
          />
          <DateRangeFilter v-model:from="dateFrom" v-model:to="dateTo" />
          <UButton
            v-if="hasFilters"
            variant="ghost"
            color="gray"
            icon="i-heroicons-x-mark"
            @click="clearFilters"
          >
            {{ t('common.clearFilters') }}
          </UButton>
        </div>
      </template>

      <UAlert
        v-if="fetchError"
        color="red"
        variant="subtle"
        class="mb-4"
        :title="apiErrorMessage(fetchError)"
      />

      <DataTable
        v-model:sort="sort"
        :rows="rows"
        :columns="columns"
        :loading="pending"
        @select="onSelect"
      >
        <template #empty-state>
          <EmptyState
            :icon="hasFilters ? 'i-heroicons-magnifying-glass' : 'i-heroicons-users'"
            :title="hasFilters ? t('common.noMatches') : t('customers.list.emptyTitle')"
            :description="
              search
                ? t('common.nothingMatches', { query: search })
                : t('customers.list.emptyDescription')
            "
          >
            <template v-if="!hasFilters" #action>
              <UButton icon="i-heroicons-plus" @click="showCreate = true">{{
                t('customers.list.newCustomer')
              }}</UButton>
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
          <span class="font-semibold">{{ t('customers.list.newCustomer') }}</span>
        </template>
        <CustomerForm
          :loading="creating"
          :submit-label="t('common.create')"
          cancelable
          @submit="onCreate"
          @cancel="showCreate = false"
        />
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { CustomerRequest, CustomerResponse } from '~/features/customers/types'
import type { BranchResponse } from '~/features/branches/types'
import type { ColumnDef, PageResponse } from '~/shared/types'

const { t } = useI18n()
const api = useApi()
const toast = useToast()
const router = useRouter()

const {
  data: customersRaw,
  pending,
  error: fetchError,
  refresh
} = await useAsyncData('customers', () =>
  api<PageResponse<CustomerResponse>>('/customers', { query: { size: 1000 } })
)

const customers = computed(() => customersRaw.value?.content ?? [])

const { data: branchesData } = await useAsyncData('branches-all', () =>
  api<BranchResponse[]>('/branches')
)
const branchNameById = computed(
  () => new Map((branchesData.value ?? []).map((b) => [b.id, b.name]))
)

const branchFilter = ref<number | ''>('')
const branchFilterOptions = computed(() => [
  { label: t('customers.list.branchFilterAll'), value: '' },
  ...(branchesData.value ?? []).map((b) => ({ label: b.name, value: b.id }))
])
const { from: dateFrom, to: dateTo, inRange } = useDateRangeFilter()
const customersByBranch = computed(() =>
  (branchFilter.value === ''
    ? customers.value
    : customers.value.filter((c) => c.branchId === branchFilter.value)
  ).filter((c) => inRange(c.createdAt))
)

const showCreate = ref(false)
const creating = ref(false)

const columns = computed<ColumnDef<CustomerResponse>[]>(() => [
  { key: 'id', label: t('customers.list.columns.id'), sortable: true },
  { key: 'firstName', label: t('customers.list.columns.firstName'), sortable: true },
  { key: 'lastName', label: t('customers.list.columns.lastName'), sortable: true },
  { key: 'email', label: t('customers.list.columns.email'), sortable: true },
  { key: 'phone', label: t('customers.list.columns.phone') },
  {
    key: 'branchId',
    label: t('customers.list.columns.branch'),
    value: (row) =>
      row.branchId != null ? (branchNameById.value.get(row.branchId) ?? row.branchId) : '—'
  },
  {
    key: 'createdAt',
    label: t('customers.list.columns.created'),
    type: 'datetime',
    sortable: true
  }
])

const { search, page, pageSize, sort, total, rows } = useClientTable(customersByBranch, {
  searchFields: ['firstName', 'lastName', 'email'],
  pageSize: 10
})

const hasFilters = computed(
  () => !!search.value || branchFilter.value !== '' || !!dateFrom.value || !!dateTo.value
)

function clearFilters() {
  search.value = ''
  branchFilter.value = ''
  dateFrom.value = ''
  dateTo.value = ''
}

const totalLabel = computed(() => {
  const count = customers.value?.length ?? 0
  return count === 1 ? t('customers.list.totalOne') : t('customers.list.totalOther', { count })
})

function onSelect(row: CustomerResponse) {
  router.push(`/customers/${row.id}`)
}

async function onCreate(payload: CustomerRequest) {
  creating.value = true
  try {
    await api('/customers', { method: 'POST', body: payload })
    toast.add({ title: t('customers.list.toastCreated'), color: 'green' })
    showCreate.value = false
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    creating.value = false
  }
}
</script>
