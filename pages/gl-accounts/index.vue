<template>
  <div>
    <PageHeader title="Chart of Accounts" :description="totalLabel">
      <template #actions>
        <UButton icon="i-heroicons-plus" @click="openCreate">New GL Account</UButton>
      </template>
    </PageHeader>

    <UCard>
      <template #header>
        <UInput
          v-model="search"
          icon="i-heroicons-magnifying-glass"
          placeholder="Search by number or name..."
          class="max-w-xs"
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
      </template>

      <DataTable v-model:sort="sort" :rows="rows" :columns="columns" :loading="pending">
        <template #actions-data="{ row }">
          <div class="flex gap-1 justify-end">
            <UButton size="2xs" variant="soft" icon="i-heroicons-pencil" @click="openEdit(row)" />
            <UButton
              size="2xs"
              color="red"
              variant="soft"
              icon="i-heroicons-trash"
              @click="confirmDelete = row"
            />
          </div>
        </template>
        <template #empty-state>
          <EmptyState
            :icon="search ? 'i-heroicons-magnifying-glass' : 'i-heroicons-list-bullet'"
            :title="search ? 'No matches' : 'No GL accounts yet'"
            :description="
              search
                ? `Nothing matches “${search}”.`
                : 'Set up the chart of accounts that journal entries post against.'
            "
          >
            <template v-if="!search" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">New GL Account</UButton>
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
          <span class="font-semibold">New GL Account</span>
        </template>
        <DynamicForm
          v-model="createForm"
          :fields="createFields"
          :loading="creating"
          :error="error"
          submit-label="Create"
          cancelable
          @submit="onCreate"
          @cancel="showCreate = false"
        />
      </UCard>
    </UModal>

    <UModal v-model="showEdit">
      <UCard>
        <template #header>
          <span class="font-semibold">Edit GL Account</span>
        </template>
        <DynamicForm
          v-model="editForm"
          :fields="editFields"
          :loading="editing"
          :error="editError"
          submit-label="Save changes"
          cancelable
          @submit="onEdit"
          @cancel="showEdit = false"
        />
      </UCard>
    </UModal>

    <ConfirmModal
      :model-value="confirmDelete !== null"
      title="Delete this GL account?"
      description="This permanently removes the account and cannot be undone. Accounts with child accounts cannot be deleted."
      confirm-label="Delete"
      color="red"
      :loading="deleting"
      @update:model-value="
        (v: boolean) => {
          if (!v) confirmDelete = null
        }
      "
      @confirm="onDelete"
    />
  </div>
</template>

<script setup lang="ts">
import type { GlAccountRequest, GlAccountResponse } from '~/features/accounting/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

const api = useApi()

const {
  data: accounts,
  pending,
  refresh
} = await useAsyncData('gl-accounts', () => api<GlAccountResponse[]>('/gl-accounts'))

const accountMap = computed(() => new Map((accounts.value ?? []).map((a) => [a.id, a])))
function accountLabel(id: number | null) {
  if (id === null) return '—'
  const a = accountMap.value.get(id)
  return a ? `${a.accountNo} — ${a.accountName}` : String(id)
}

const columns: ColumnDef<GlAccountResponse>[] = [
  { key: 'accountNo', label: 'Account no.', sortable: true },
  { key: 'accountName', label: 'Name', sortable: true },
  { key: 'parentId', label: 'Parent', value: (row) => accountLabel(row.parentId) },
  { key: 'accountType', label: 'Type', type: 'enum', sortable: true },
  { key: 'normalBalance', label: 'Normal balance', type: 'enum', sortable: true },
  { key: 'currency', sortable: true },
  { key: 'allowPosting', label: 'Postable', type: 'boolean', trueColor: 'teal' },
  { key: 'status', type: 'status', sortable: true },
  { key: 'actions', label: '', class: 'text-right' }
]

const { search, page, pageSize, sort, total, rows } = useClientTable(accounts, {
  searchFields: ['accountNo', 'accountName'],
  pageSize: 15
})

const totalLabel = computed(() => {
  const count = accounts.value?.length ?? 0
  return count === 1 ? '1 GL account' : `${count} GL accounts`
})

const accountTypeOptions = [
  { label: 'Asset', value: 'ASSET' },
  { label: 'Liability', value: 'LIABILITY' },
  { label: 'Equity', value: 'EQUITY' },
  { label: 'Income', value: 'INCOME' },
  { label: 'Expense', value: 'EXPENSE' }
]

const entrySideOptions = [
  { label: 'Debit', value: 'DEBIT' },
  { label: 'Credit', value: 'CREDIT' }
]

const statusOptions = [
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Inactive', value: 'INACTIVE' }
]

function parentOptions(excludeId?: number) {
  return (accounts.value ?? [])
    .filter((a) => a.id !== excludeId)
    .map((a) => ({ label: `${a.accountNo} — ${a.accountName}`, value: a.id }))
}

const createFields = computed<FieldDef[]>(() => [
  { name: 'accountNo', label: 'Account number', required: true, wrapper: 'half' },
  { name: 'accountName', label: 'Account name', required: true, wrapper: 'half' },
  {
    name: 'parentId',
    label: 'Parent account',
    type: 'select',
    wrapper: 'half',
    options: parentOptions(),
    hint: 'Leave blank for a top-level account'
  },
  {
    name: 'accountType',
    label: 'Account type',
    type: 'select',
    required: true,
    wrapper: 'half',
    options: accountTypeOptions
  },
  {
    name: 'normalBalance',
    label: 'Normal balance',
    type: 'select',
    required: true,
    wrapper: 'half',
    options: entrySideOptions
  },
  { name: 'currency', required: true, wrapper: 'half' },
  {
    name: 'allowPosting',
    label: 'Allow direct posting',
    type: 'switch',
    default: true,
    wrapper: 'half'
  },
  {
    name: 'status',
    type: 'select',
    required: true,
    default: 'ACTIVE',
    wrapper: 'half',
    options: statusOptions
  }
])

const editFields = computed<FieldDef[]>(() => [
  { name: 'accountNo', label: 'Account number', required: true, wrapper: 'half' },
  { name: 'accountName', label: 'Account name', required: true, wrapper: 'half' },
  {
    name: 'parentId',
    label: 'Parent account',
    type: 'select',
    wrapper: 'half',
    options: parentOptions((editingId.value as number | undefined) ?? undefined),
    hint: 'Leave blank for a top-level account'
  },
  {
    name: 'accountType',
    label: 'Account type',
    type: 'select',
    required: true,
    wrapper: 'half',
    options: accountTypeOptions
  },
  {
    name: 'normalBalance',
    label: 'Normal balance',
    type: 'select',
    required: true,
    wrapper: 'half',
    options: entrySideOptions
  },
  { name: 'currency', required: true, wrapper: 'half' },
  { name: 'allowPosting', label: 'Allow direct posting', type: 'switch', wrapper: 'half' },
  { name: 'status', type: 'select', required: true, wrapper: 'half', options: statusOptions }
])

const {
  showCreate,
  creating,
  error,
  createForm,
  openCreate,
  onCreate,
  showEdit,
  editing,
  editError,
  editingId,
  editForm,
  openEdit,
  onEdit,
  deleting,
  confirmDelete,
  onDelete
} = useCrudModals<GlAccountResponse, GlAccountRequest>('/gl-accounts', refresh, {
  entityName: 'GL account',
  createDefaults: () => ({
    accountNo: '',
    accountName: '',
    parentId: undefined,
    accountType: undefined,
    normalBalance: undefined,
    currency: '',
    allowPosting: true,
    status: 'ACTIVE'
  }),
  toForm: (row) => ({
    accountNo: row.accountNo,
    accountName: row.accountName,
    parentId: row.parentId ?? undefined,
    accountType: row.accountType,
    normalBalance: row.normalBalance,
    currency: row.currency,
    allowPosting: row.allowPosting,
    status: row.status
  }),
  toPayload: (values) => ({
    accountNo: values.accountNo,
    accountName: values.accountName,
    parentId: values.parentId || undefined,
    accountType: values.accountType,
    normalBalance: values.normalBalance,
    currency: values.currency,
    allowPosting: values.allowPosting ?? false,
    status: values.status
  })
})
</script>
