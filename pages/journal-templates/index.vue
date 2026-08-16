<template>
  <div>
    <PageHeader :title="t('accounting.journalTemplates.title')" :description="totalLabel">
      <template #actions>
        <UButton icon="i-heroicons-plus" @click="openCreate">{{
          t('accounting.journalTemplates.newJournalTemplate')
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
            icon="i-heroicons-document-text"
            :title="t('accounting.journalTemplates.emptyTitle')"
            :description="t('accounting.journalTemplates.emptyDescription')"
          >
            <template #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">{{
                t('accounting.journalTemplates.newJournalTemplate')
              }}</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>

    <UModal v-model="showCreate" :ui="{ width: 'sm:max-w-2xl' }">
      <UCard>
        <template #header>
          <span class="font-semibold">{{
            t('accounting.journalTemplates.newJournalTemplate')
          }}</span>
        </template>
        <DynamicForm
          v-model="createForm"
          :fields="fields"
          :loading="creating"
          :error="error"
          :submit-label="t('common.create')"
          cancelable
          @submit="onCreate"
          @cancel="showCreate = false"
        />
      </UCard>
    </UModal>

    <UModal v-model="showEdit" :ui="{ width: 'sm:max-w-2xl' }">
      <UCard>
        <template #header>
          <span class="font-semibold">{{
            t('accounting.journalTemplates.editJournalTemplate')
          }}</span>
        </template>
        <DynamicForm
          v-model="editForm"
          :fields="fields"
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
      :title="
        confirmDelete
          ? t('accounting.journalTemplates.deleteConfirmTitle', { name: confirmDelete.name })
          : ''
      "
      :description="t('accounting.journalTemplates.deleteConfirmDescription')"
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
  JournalTemplateLineRequest,
  JournalTemplateRequest,
  JournalTemplateResponse,
  TransactionType
} from '~/features/accounting/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

// Shape of createForm/editForm's value — kept as a plain (non-exported)
// interface here since <script setup> can't export runtime bindings.
interface JournalTemplateFormValue {
  code: string
  name: string
  transactionType: TransactionType | undefined
  description: string
  status: 'ACTIVE' | 'INACTIVE'
  lines: JournalTemplateLineRequest[]
}

const { t } = useI18n()
const api = useApi()
const toast = useToast()

const {
  data: templates,
  pending,
  error: fetchError,
  refresh
} = await useAsyncData('journal-templates', () =>
  api<JournalTemplateResponse[]>('/journal-templates')
)

const columns = computed<ColumnDef<JournalTemplateResponse>[]>(() => [
  { key: 'code', label: t('accounting.journalTemplates.columns.code'), sortable: true },
  { key: 'name', label: t('accounting.journalTemplates.columns.name'), sortable: true },
  {
    key: 'transactionType',
    label: t('accounting.journalTemplates.columns.transactionType'),
    type: 'enum',
    sortable: true
  },
  {
    key: 'lines',
    label: t('accounting.journalTemplates.columns.lines'),
    value: (row) => row.lines.length
  },
  {
    key: 'status',
    label: t('accounting.journalTemplates.columns.status'),
    type: 'status',
    sortable: true
  },
  { key: 'actions', label: '', class: 'text-right' }
])

const { page, pageSize, sort, total, rows } = useClientTable(templates, { pageSize: 10 })

const transactionTypeOptions = computed(() => [
  { label: t('accounting.transactionTypes.disbursement'), value: 'DISBURSEMENT' },
  { label: t('accounting.transactionTypes.principalPayment'), value: 'PRINCIPAL_PAYMENT' },
  { label: t('accounting.transactionTypes.interestPayment'), value: 'INTEREST_PAYMENT' },
  { label: t('accounting.transactionTypes.feeCharge'), value: 'FEE_CHARGE' },
  { label: t('accounting.transactionTypes.penaltyCharge'), value: 'PENALTY_CHARGE' },
  { label: t('accounting.transactionTypes.loanWriteOff'), value: 'LOAN_WRITE_OFF' },
  { label: t('accounting.transactionTypes.paymentReversal'), value: 'PAYMENT_REVERSAL' }
])
const entrySideOptions = computed(() => [
  { label: t('accounting.entrySides.debit'), value: 'DEBIT' },
  { label: t('accounting.entrySides.credit'), value: 'CREDIT' }
])
const statusOptions = computed(() => [
  { label: t('common.active'), value: 'ACTIVE' },
  { label: t('common.inactive'), value: 'INACTIVE' }
])

// Shared by the create and edit modals — a `repeatable` field renders `lines`
// as add/remove-able rows, each row a mini-form of the subfields below.
const fields = computed<FieldDef[]>(() => [
  {
    name: 'code',
    label: t('accounting.journalTemplates.fields.code'),
    required: true,
    wrapper: 'half'
  },
  {
    name: 'name',
    label: t('accounting.journalTemplates.fields.name'),
    required: true,
    wrapper: 'half'
  },
  {
    name: 'transactionType',
    label: t('accounting.journalTemplates.fields.transactionType'),
    type: 'select',
    options: transactionTypeOptions.value,
    required: true,
    wrapper: 'half'
  },
  {
    name: 'status',
    label: t('accounting.journalTemplates.fields.status'),
    type: 'select',
    options: statusOptions.value,
    required: true,
    wrapper: 'half'
  },
  {
    name: 'description',
    label: t('accounting.journalTemplates.fields.description'),
    type: 'textarea',
    rows: 2,
    wrapper: 'full'
  },
  {
    name: 'lines',
    label: t('accounting.journalTemplates.fields.lines'),
    type: 'repeatable',
    required: true,
    minRows: 2,
    wrapper: 'full',
    hint: t('accounting.journalTemplates.fields.rolesHint'),
    addLabel: t('accounting.journalTemplates.fields.addLine'),
    rowLabel: (i) => t('accounting.journalTemplates.fields.lineLabel', { n: i + 1 }),
    newRow: () => ({ accountRole: '', entrySide: 'DEBIT', description: '' }),
    subfields: [
      {
        name: 'accountRole',
        label: t('accounting.journalTemplates.fields.accountRole'),
        placeholder: t('accounting.journalTemplates.fields.accountRolePlaceholder'),
        required: true,
        wrapper: 'half'
      },
      {
        name: 'entrySide',
        label: t('accounting.journalTemplates.fields.entrySide'),
        type: 'select',
        options: entrySideOptions.value,
        required: true,
        wrapper: 'half'
      },
      {
        name: 'description',
        label: t('accounting.journalTemplates.fields.lineDescription'),
        placeholder: t('accounting.journalTemplates.fields.lineDescriptionPlaceholder'),
        wrapper: 'full'
      }
    ]
  }
])

const totalLabel = computed(() => {
  const count = templates.value?.length ?? 0
  return count === 1
    ? t('accounting.journalTemplates.totalLabelOne')
    : t('accounting.journalTemplates.totalLabelOther', { count })
})

function emptyForm(): JournalTemplateFormValue {
  return {
    code: '',
    name: '',
    transactionType: undefined,
    description: '',
    status: 'ACTIVE',
    lines: [
      { lineNo: 1, accountRole: '', entrySide: 'DEBIT', description: '' },
      { lineNo: 2, accountRole: '', entrySide: 'CREDIT', description: '' }
    ]
  }
}

function toPayload(values: JournalTemplateFormValue): JournalTemplateRequest {
  return {
    code: values.code,
    name: values.name,
    transactionType: values.transactionType!,
    description: values.description || undefined,
    status: values.status,
    lines: values.lines.map((l, i) => ({ ...l, lineNo: i + 1 }))
  }
}

const showCreate = ref(false)
const creating = ref(false)
const error = ref('')
const createForm = ref<Record<string, any>>(emptyForm())

function openCreate() {
  createForm.value = emptyForm()
  error.value = ''
  showCreate.value = true
}

async function onCreate() {
  creating.value = true
  error.value = ''
  try {
    await api('/journal-templates', {
      method: 'POST',
      body: toPayload(createForm.value as JournalTemplateFormValue)
    })
    toast.add({ title: t('accounting.journalTemplates.templateCreated'), color: 'green' })
    showCreate.value = false
    await refresh()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    creating.value = false
  }
}

const showEdit = ref(false)
const editing = ref(false)
const editError = ref('')
const editingId = ref<number | null>(null)
const editForm = ref<Record<string, any>>(emptyForm())

function openEdit(row: JournalTemplateResponse) {
  editingId.value = row.id
  editForm.value = {
    code: row.code,
    name: row.name,
    transactionType: row.transactionType,
    description: row.description ?? '',
    status: row.status,
    lines: row.lines.length
      ? row.lines.map((l) => ({
          lineNo: l.lineNo,
          accountRole: l.accountRole,
          entrySide: l.entrySide,
          description: l.description ?? ''
        }))
      : emptyForm().lines
  }
  editError.value = ''
  showEdit.value = true
}

async function onEdit() {
  if (editingId.value === null) return
  editing.value = true
  editError.value = ''
  try {
    await api(`/journal-templates/${editingId.value}`, {
      method: 'PUT',
      body: toPayload(editForm.value as JournalTemplateFormValue)
    })
    toast.add({ title: t('accounting.journalTemplates.templateUpdated'), color: 'green' })
    showEdit.value = false
    await refresh()
  } catch (err) {
    editError.value = apiErrorMessage(err)
  } finally {
    editing.value = false
  }
}

const deleting = ref(false)
const confirmDelete = ref<JournalTemplateResponse | null>(null)

async function onDelete() {
  if (!confirmDelete.value) return
  deleting.value = true
  try {
    await api(`/journal-templates/${confirmDelete.value.id}`, { method: 'DELETE' })
    toast.add({ title: t('accounting.journalTemplates.templateDeleted'), color: 'green' })
    confirmDelete.value = null
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    deleting.value = false
  }
}
</script>
