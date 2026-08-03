<template>
  <div>
    <PageHeader :title="t('accounting.glAccounts.title')" :description="totalLabel">
      <template #actions>
        <UButton icon="i-heroicons-plus" @click="openCreate">{{
          t('accounting.glAccounts.newGlAccount')
        }}</UButton>
      </template>
    </PageHeader>

    <UCard>
      <template #header>
        <UInput
          v-model="search"
          icon="i-heroicons-magnifying-glass"
          :placeholder="t('accounting.glAccounts.searchPlaceholder')"
          class="max-w-xs"
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
      </template>

      <UAlert
        v-if="fetchError"
        color="red"
        variant="subtle"
        class="mb-4"
        :title="apiErrorMessage(fetchError)"
      />

      <DataTable v-model:sort="sort" :rows="rows" :columns="columns" :loading="pending">
        <template #actions-data="{ row }">
          <div class="flex gap-1 justify-end">
            <UButton
              size="2xs"
              variant="soft"
              icon="i-heroicons-pencil"
              :aria-label="t('common.edit')"
              @click="openEdit(row)"
            />
            <UButton
              size="2xs"
              color="red"
              variant="soft"
              icon="i-heroicons-trash"
              :aria-label="t('common.delete')"
              @click="confirmDelete = row"
            />
          </div>
        </template>
        <template #empty-state>
          <EmptyState
            :icon="search ? 'i-heroicons-magnifying-glass' : 'i-heroicons-list-bullet'"
            :title="search ? t('common.noMatches') : t('accounting.glAccounts.emptyTitle')"
            :description="
              search
                ? t('common.nothingMatches', { query: search })
                : t('accounting.glAccounts.emptyDescription')
            "
          >
            <template v-if="!search" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">{{
                t('accounting.glAccounts.newGlAccount')
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
          <span class="font-semibold">{{ t('accounting.glAccounts.newGlAccount') }}</span>
        </template>
        <DynamicForm
          v-model="createForm"
          :fields="createFields"
          :loading="creating"
          :error="error"
          :submit-label="t('common.create')"
          cancelable
          @submit="onCreate"
          @cancel="showCreate = false"
        />
      </UCard>
    </UModal>

    <UModal v-model="showEdit">
      <UCard>
        <template #header>
          <span class="font-semibold">{{ t('accounting.glAccounts.editGlAccount') }}</span>
        </template>
        <DynamicForm
          v-model="editForm"
          :fields="editFields"
          :loading="editing"
          :error="editError"
          :submit-label="t('common.saveChanges')"
          cancelable
          @submit="onEdit"
          @cancel="showEdit = false"
        />
      </UCard>
    </UModal>

    <ConfirmModal
      :model-value="confirmDelete !== null"
      :title="t('accounting.glAccounts.deleteConfirmTitle')"
      :description="t('accounting.glAccounts.deleteConfirmDescription')"
      :confirm-label="t('common.delete')"
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

const { t } = useI18n()
const api = useApi()

const {
  data: accounts,
  pending,
  error: fetchError,
  refresh
} = await useAsyncData('gl-accounts', () => api<GlAccountResponse[]>('/gl-accounts'))

const accountMap = computed(() => new Map((accounts.value ?? []).map((a) => [a.id, a])))
function accountLabel(id: number | null) {
  if (id === null) return '—'
  const a = accountMap.value.get(id)
  return a ? `${a.accountNo} — ${a.accountName}` : String(id)
}

const columns = computed<ColumnDef<GlAccountResponse>[]>(() => [
  { key: 'accountNo', label: t('accounting.glAccounts.columns.accountNo'), sortable: true },
  { key: 'accountName', label: t('accounting.glAccounts.columns.name'), sortable: true },
  {
    key: 'parentId',
    label: t('accounting.glAccounts.columns.parent'),
    value: (row) => accountLabel(row.parentId)
  },
  {
    key: 'accountType',
    label: t('accounting.glAccounts.columns.type'),
    type: 'enum',
    sortable: true
  },
  {
    key: 'normalBalance',
    label: t('accounting.glAccounts.columns.normalBalance'),
    type: 'enum',
    sortable: true
  },
  { key: 'currency', label: t('accounting.glAccounts.columns.currency'), sortable: true },
  {
    key: 'allowPosting',
    label: t('accounting.glAccounts.columns.postable'),
    type: 'boolean',
    trueColor: 'teal'
  },
  {
    key: 'status',
    label: t('accounting.glAccounts.columns.status'),
    type: 'status',
    sortable: true
  },
  { key: 'actions', label: '', class: 'text-right' }
])

const { search, page, pageSize, sort, total, rows } = useClientTable(accounts, {
  searchFields: ['accountNo', 'accountName'],
  pageSize: 15
})

const totalLabel = computed(() => {
  const count = accounts.value?.length ?? 0
  return count === 1
    ? t('accounting.glAccounts.totalLabelOne')
    : t('accounting.glAccounts.totalLabelOther', { count })
})

const accountTypeOptions = computed(() => [
  { label: t('accounting.glAccounts.accountTypes.asset'), value: 'ASSET' },
  { label: t('accounting.glAccounts.accountTypes.liability'), value: 'LIABILITY' },
  { label: t('accounting.glAccounts.accountTypes.equity'), value: 'EQUITY' },
  { label: t('accounting.glAccounts.accountTypes.income'), value: 'INCOME' },
  { label: t('accounting.glAccounts.accountTypes.expense'), value: 'EXPENSE' }
])

const entrySideOptions = computed(() => [
  { label: t('accounting.entrySides.debit'), value: 'DEBIT' },
  { label: t('accounting.entrySides.credit'), value: 'CREDIT' }
])

const statusOptions = computed(() => [
  { label: t('common.active'), value: 'ACTIVE' },
  { label: t('common.inactive'), value: 'INACTIVE' }
])

function parentOptions(excludeId?: number) {
  return (accounts.value ?? [])
    .filter((a) => a.id !== excludeId)
    .map((a) => ({ label: `${a.accountNo} — ${a.accountName}`, value: a.id }))
}

const createFields = computed<FieldDef[]>(() => [
  {
    name: 'accountNo',
    label: t('accounting.glAccounts.fields.accountNo'),
    required: true,
    wrapper: 'half'
  },
  {
    name: 'accountName',
    label: t('accounting.glAccounts.fields.accountName'),
    required: true,
    wrapper: 'half'
  },
  {
    name: 'parentId',
    label: t('accounting.glAccounts.fields.parentAccount'),
    type: 'select',
    wrapper: 'half',
    options: parentOptions(),
    hint: t('accounting.glAccounts.fields.parentAccountHint')
  },
  {
    name: 'accountType',
    label: t('accounting.glAccounts.fields.accountType'),
    type: 'select',
    required: true,
    wrapper: 'half',
    options: accountTypeOptions.value
  },
  {
    name: 'normalBalance',
    label: t('accounting.glAccounts.fields.normalBalance'),
    type: 'select',
    required: true,
    wrapper: 'half',
    options: entrySideOptions.value
  },
  {
    name: 'currency',
    label: t('accounting.glAccounts.fields.currency'),
    required: true,
    wrapper: 'half'
  },
  {
    name: 'allowPosting',
    label: t('accounting.glAccounts.fields.allowPosting'),
    type: 'switch',
    default: true,
    wrapper: 'half'
  },
  {
    name: 'status',
    label: t('accounting.glAccounts.fields.status'),
    type: 'select',
    required: true,
    default: 'ACTIVE',
    wrapper: 'half',
    options: statusOptions.value
  }
])

const editFields = computed<FieldDef[]>(() => [
  {
    name: 'accountNo',
    label: t('accounting.glAccounts.fields.accountNo'),
    required: true,
    wrapper: 'half'
  },
  {
    name: 'accountName',
    label: t('accounting.glAccounts.fields.accountName'),
    required: true,
    wrapper: 'half'
  },
  {
    name: 'parentId',
    label: t('accounting.glAccounts.fields.parentAccount'),
    type: 'select',
    wrapper: 'half',
    options: parentOptions((editingId.value as number | undefined) ?? undefined),
    hint: t('accounting.glAccounts.fields.parentAccountHint')
  },
  {
    name: 'accountType',
    label: t('accounting.glAccounts.fields.accountType'),
    type: 'select',
    required: true,
    wrapper: 'half',
    options: accountTypeOptions.value
  },
  {
    name: 'normalBalance',
    label: t('accounting.glAccounts.fields.normalBalance'),
    type: 'select',
    required: true,
    wrapper: 'half',
    options: entrySideOptions.value
  },
  {
    name: 'currency',
    label: t('accounting.glAccounts.fields.currency'),
    required: true,
    wrapper: 'half'
  },
  {
    name: 'allowPosting',
    label: t('accounting.glAccounts.fields.allowPosting'),
    type: 'switch',
    wrapper: 'half'
  },
  {
    name: 'status',
    label: t('accounting.glAccounts.fields.status'),
    type: 'select',
    required: true,
    wrapper: 'half',
    options: statusOptions.value
  }
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
  entityName: t('accounting.entities.glAccount'),
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
