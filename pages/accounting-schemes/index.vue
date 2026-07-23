<template>
  <div>
    <PageHeader title="Accounting Schemes" :description="totalLabel">
      <template #actions>
        <UButton icon="i-heroicons-plus" @click="openCreate">New Accounting Scheme</UButton>
      </template>
    </PageHeader>

    <UCard>
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
            icon="i-heroicons-link"
            title="No accounting schemes yet"
            description="Bind a journal template's symbolic account role (e.g. CASH) to a real GL account for a given currency."
          >
            <template #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">New Accounting Scheme</UButton>
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
          <span class="font-semibold">New Accounting Scheme</span>
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
          <span class="font-semibold">Edit Accounting Scheme</span>
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
      title="Delete this accounting scheme?"
      description="This permanently removes the binding and cannot be undone."
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
import type {
  AccountingSchemeRequest,
  AccountingSchemeResponse,
  GlAccountResponse,
  JournalTemplateResponse
} from '~/features/accounting/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

const api = useApi()

const {
  data: schemes,
  pending,
  refresh
} = await useAsyncData('accounting-schemes', () =>
  api<AccountingSchemeResponse[]>('/accounting-schemes')
)
const { data: templates } = await useAsyncData('accounting-schemes-templates', () =>
  api<JournalTemplateResponse[]>('/journal-templates')
)
const { data: glAccounts } = await useAsyncData('accounting-schemes-gl-accounts', () =>
  api<GlAccountResponse[]>('/gl-accounts')
)

const templateMap = computed(() => new Map((templates.value ?? []).map((t) => [t.id, t])))
function templateLabel(id: number) {
  const t = templateMap.value.get(id)
  return t ? `${t.name} (${t.code})` : String(id)
}
const templateOptions = computed(() =>
  (templates.value ?? []).map((t) => ({ label: `${t.name} (${t.code})`, value: t.id }))
)
const glAccountOptions = computed(() =>
  (glAccounts.value ?? []).map((a) => ({ label: `${a.accountNo} — ${a.accountName}`, value: a.id }))
)

function rolesFor(templateId: number | undefined) {
  const template = templateId !== undefined ? templateMap.value.get(templateId) : undefined
  const roles = [...new Set((template?.lines ?? []).map((l) => l.accountRole))]
  return roles.map((r) => ({ label: r, value: r }))
}

const columns: ColumnDef<AccountingSchemeResponse>[] = [
  {
    key: 'journalTemplateId',
    label: 'Journal template',
    value: (row) => templateLabel(row.journalTemplateId)
  },
  { key: 'accountRole', label: 'Role' },
  { key: 'glAccountNo', label: 'GL account' },
  { key: 'currency', sortable: true },
  { key: 'status', type: 'status', sortable: true },
  { key: 'actions', label: '', class: 'text-right' }
]

const { page, pageSize, sort, total, rows } = useClientTable(schemes, { pageSize: 15 })

const totalLabel = computed(() => {
  const count = schemes.value?.length ?? 0
  return count === 1 ? '1 accounting scheme' : `${count} accounting schemes`
})

const statusOptions = [
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Inactive', value: 'INACTIVE' }
]

const createFields = computed<FieldDef[]>(() => [
  {
    name: 'journalTemplateId',
    label: 'Journal template',
    type: 'select',
    required: true,
    wrapper: 'half',
    options: templateOptions.value
  },
  {
    name: 'accountRole',
    label: 'Account role',
    type: 'select',
    required: true,
    wrapper: 'half',
    options: rolesFor(createForm.value.journalTemplateId),
    hint: 'Pick a journal template first'
  },
  {
    name: 'glAccountId',
    label: 'GL account',
    type: 'select',
    required: true,
    wrapper: 'half',
    options: glAccountOptions.value
  },
  { name: 'currency', required: true, wrapper: 'half' },
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
  {
    name: 'journalTemplateId',
    label: 'Journal template',
    type: 'select',
    required: true,
    wrapper: 'half',
    options: templateOptions.value
  },
  {
    name: 'accountRole',
    label: 'Account role',
    type: 'select',
    required: true,
    wrapper: 'half',
    options: rolesFor(editForm.value.journalTemplateId)
  },
  {
    name: 'glAccountId',
    label: 'GL account',
    type: 'select',
    required: true,
    wrapper: 'half',
    options: glAccountOptions.value
  },
  { name: 'currency', required: true, wrapper: 'half' },
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
  editForm,
  openEdit,
  onEdit,
  deleting,
  confirmDelete,
  onDelete
} = useCrudModals<AccountingSchemeResponse, AccountingSchemeRequest>(
  '/accounting-schemes',
  refresh,
  {
    entityName: 'Accounting scheme',
    createDefaults: () => ({
      journalTemplateId: undefined,
      accountRole: undefined,
      glAccountId: undefined,
      currency: '',
      status: 'ACTIVE'
    }),
    toForm: (row) => ({
      journalTemplateId: row.journalTemplateId,
      accountRole: row.accountRole,
      glAccountId: row.glAccountId,
      currency: row.currency,
      status: row.status
    }),
    toPayload: (values) => ({
      journalTemplateId: values.journalTemplateId,
      accountRole: values.accountRole,
      glAccountId: values.glAccountId,
      currency: values.currency,
      status: values.status
    })
  }
)
</script>
