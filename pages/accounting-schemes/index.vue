<template>
  <div>
    <PageHeader :title="t('accounting.accountingSchemes.title')" :description="totalLabel">
      <template #actions>
        <UButton icon="i-heroicons-plus" @click="openCreate">{{
          t('accounting.accountingSchemes.newAccountingScheme')
        }}</UButton>
      </template>
    </PageHeader>

    <UCard>
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
            icon="i-heroicons-link"
            :title="t('accounting.accountingSchemes.emptyTitle')"
            :description="t('accounting.accountingSchemes.emptyDescription')"
          >
            <template #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">{{
                t('accounting.accountingSchemes.newAccountingScheme')
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
          <span class="font-semibold">{{
            t('accounting.accountingSchemes.newAccountingScheme')
          }}</span>
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
          <span class="font-semibold">{{
            t('accounting.accountingSchemes.editAccountingScheme')
          }}</span>
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
      :title="t('accounting.accountingSchemes.deleteConfirmTitle')"
      :description="t('accounting.accountingSchemes.deleteConfirmDescription')"
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
import type {
  AccountingSchemeRequest,
  AccountingSchemeResponse,
  GlAccountResponse,
  JournalTemplateResponse
} from '~/features/accounting/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

const { t } = useI18n()
const api = useApi()

const {
  data: schemes,
  pending,
  error: fetchError,
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

const columns = computed<ColumnDef<AccountingSchemeResponse>[]>(() => [
  {
    key: 'journalTemplateId',
    label: t('accounting.accountingSchemes.columns.journalTemplate'),
    value: (row) => templateLabel(row.journalTemplateId)
  },
  { key: 'accountRole', label: t('accounting.accountingSchemes.columns.role') },
  { key: 'glAccountNo', label: t('accounting.accountingSchemes.columns.glAccount') },
  { key: 'currency', label: t('accounting.accountingSchemes.columns.currency'), sortable: true },
  {
    key: 'status',
    label: t('accounting.accountingSchemes.columns.status'),
    type: 'status',
    sortable: true
  },
  { key: 'actions', label: '', class: 'text-right' }
])

const { page, pageSize, sort, total, rows } = useClientTable(schemes, { pageSize: 15 })

const totalLabel = computed(() => {
  const count = schemes.value?.length ?? 0
  return count === 1
    ? t('accounting.accountingSchemes.totalLabelOne')
    : t('accounting.accountingSchemes.totalLabelOther', { count })
})

const statusOptions = computed(() => [
  { label: t('common.active'), value: 'ACTIVE' },
  { label: t('common.inactive'), value: 'INACTIVE' }
])

const createFields = computed<FieldDef[]>(() => [
  {
    name: 'journalTemplateId',
    label: t('accounting.accountingSchemes.fields.journalTemplate'),
    type: 'select',
    required: true,
    wrapper: 'half',
    options: templateOptions.value
  },
  {
    name: 'accountRole',
    label: t('accounting.accountingSchemes.fields.accountRole'),
    type: 'select',
    required: true,
    wrapper: 'half',
    options: rolesFor(createForm.value.journalTemplateId),
    hint: t('accounting.accountingSchemes.fields.accountRoleHint')
  },
  {
    name: 'glAccountId',
    label: t('accounting.accountingSchemes.fields.glAccount'),
    type: 'select',
    required: true,
    wrapper: 'half',
    options: glAccountOptions.value
  },
  {
    name: 'currency',
    label: t('accounting.accountingSchemes.fields.currency'),
    required: true,
    wrapper: 'half'
  },
  {
    name: 'status',
    label: t('accounting.accountingSchemes.fields.status'),
    type: 'select',
    required: true,
    default: 'ACTIVE',
    wrapper: 'half',
    options: statusOptions.value
  }
])

const editFields = computed<FieldDef[]>(() => [
  {
    name: 'journalTemplateId',
    label: t('accounting.accountingSchemes.fields.journalTemplate'),
    type: 'select',
    required: true,
    wrapper: 'half',
    options: templateOptions.value
  },
  {
    name: 'accountRole',
    label: t('accounting.accountingSchemes.fields.accountRole'),
    type: 'select',
    required: true,
    wrapper: 'half',
    options: rolesFor(editForm.value.journalTemplateId)
  },
  {
    name: 'glAccountId',
    label: t('accounting.accountingSchemes.fields.glAccount'),
    type: 'select',
    required: true,
    wrapper: 'half',
    options: glAccountOptions.value
  },
  {
    name: 'currency',
    label: t('accounting.accountingSchemes.fields.currency'),
    required: true,
    wrapper: 'half'
  },
  {
    name: 'status',
    label: t('accounting.accountingSchemes.fields.status'),
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
    entityName: t('accounting.entities.accountingScheme'),
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
