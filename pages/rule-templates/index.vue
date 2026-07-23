<template>
  <div>
    <PageHeader title="Rule Templates" :description="totalLabel">
      <template #actions>
        <UButton icon="i-heroicons-plus" @click="openCreate">New Rule Template</UButton>
      </template>
    </PageHeader>

    <UCard>
      <template #header>
        <UInput
          v-model="search"
          icon="i-heroicons-magnifying-glass"
          placeholder="Search by name or code..."
          class="max-w-xs"
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
      >
        <template #actions-data="{ row }">
          <div class="flex gap-1 justify-end">
            <UButton size="2xs" variant="soft" icon="i-heroicons-pencil" @click="openEdit(row)" />
            <UButton size="2xs" color="red" variant="soft" icon="i-heroicons-trash" @click="confirmDelete = row" />
          </div>
        </template>
        <template #empty-state>
          <EmptyState
            :icon="search ? 'i-heroicons-magnifying-glass' : 'i-heroicons-adjustments-horizontal'"
            :title="search ? 'No matches' : 'No rule templates yet'"
            :description="search ? `Nothing matches “${search}”.` : 'Add a reusable eligibility rule (e.g. Min Credit Score 650) that loan products can select.'"
          >
            <template v-if="!search" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">New Rule Template</UButton>
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
          <span class="font-semibold">New Rule Template</span>
        </template>
        <DynamicForm
          v-model="createForm"
          :fields="fields"
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
          <span class="font-semibold">Edit Rule Template</span>
        </template>
        <DynamicForm
          v-model="editForm"
          :fields="fields"
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
      title="Delete this rule template?"
      description="This permanently removes the rule template and cannot be undone."
      confirm-label="Delete"
      color="red"
      :loading="deleting"
      @update:model-value="(v: boolean) => { if (!v) confirmDelete = null }"
      @confirm="onDelete"
    />
  </div>
</template>

<script setup lang="ts">
import type { RuleTemplateRequest, RuleTemplateResponse } from '~/features/loan-configuration/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

const api = useApi()

const { data: templates, pending, refresh } = await useAsyncData('rule-templates', () => api<RuleTemplateResponse[]>('/rule-templates'))

const columns: ColumnDef<RuleTemplateResponse>[] = [
  { key: 'code', sortable: true },
  { key: 'name', sortable: true },
  { key: 'field', type: 'enum', sortable: true },
  { key: 'operator', type: 'enum', sortable: true },
  { key: 'status', type: 'status', sortable: true },
  { key: 'createdAt', label: 'Created', type: 'datetime', sortable: true },
  { key: 'actions', label: '', class: 'text-right' }
]

const { search, page, pageSize, sort, total, rows } = useClientTable(templates, {
  searchFields: ['name', 'code'],
  pageSize: 10
})

const totalLabel = computed(() => {
  const count = templates.value?.length ?? 0
  return count === 1 ? '1 rule template' : `${count} rule templates`
})

const fields: FieldDef[] = [
  { name: 'code', required: true, wrapper: 'half' },
  { name: 'name', required: true, wrapper: 'half' },
  {
    name: 'field',
    type: 'select',
    required: true,
    wrapper: 'half',
    options: [
      { label: 'Credit score', value: 'CREDIT_SCORE' },
      { label: 'Monthly income', value: 'MONTHLY_INCOME' },
      { label: 'Age', value: 'AGE' },
      { label: 'Employment status', value: 'EMPLOYMENT_STATUS' },
      { label: 'Existing loan count', value: 'EXISTING_LOAN_COUNT' },
      { label: 'Debt to income ratio', value: 'DEBT_TO_INCOME_RATIO' }
    ]
  },
  {
    name: 'operator',
    type: 'select',
    required: true,
    wrapper: 'half',
    options: [
      { label: 'Equals', value: 'EQUALS' },
      { label: 'Not equals', value: 'NOT_EQUALS' },
      { label: 'Greater than', value: 'GREATER_THAN' },
      { label: 'Greater than or equal', value: 'GREATER_THAN_OR_EQUAL' },
      { label: 'Less than', value: 'LESS_THAN' },
      { label: 'Less than or equal', value: 'LESS_THAN_OR_EQUAL' },
      { label: 'Between', value: 'BETWEEN' },
      { label: 'In', value: 'IN' }
    ]
  },
  { name: 'value', label: 'Value', required: true, wrapper: 'half', hint: 'Lower bound for BETWEEN, comma-separated list for IN' },
  { name: 'value2', label: 'Value 2', wrapper: 'half', hint: 'Upper bound — required only when operator is BETWEEN' },
  { name: 'description', type: 'textarea' },
  {
    name: 'status',
    type: 'select',
    required: true,
    default: 'ACTIVE',
    wrapper: 'half',
    options: [
      { label: 'Active', value: 'ACTIVE' },
      { label: 'Inactive', value: 'INACTIVE' }
    ]
  }
]

const {
  showCreate, creating, error, createForm, openCreate, onCreate,
  showEdit, editing, editError, editForm, openEdit, onEdit,
  deleting, confirmDelete, onDelete
} = useCrudModals<RuleTemplateResponse, RuleTemplateRequest>('/rule-templates', refresh, {
  entityName: 'Rule template',
  createDefaults: () => ({ code: '', name: '', field: undefined, operator: undefined, value: '', value2: '', description: '', status: 'ACTIVE' }),
  toForm: row => ({
    code: row.code,
    name: row.name,
    field: row.field,
    operator: row.operator,
    value: row.value,
    value2: row.value2 ?? '',
    description: row.description ?? '',
    status: row.status
  }),
  toPayload: values => ({
    code: values.code,
    name: values.name,
    field: values.field,
    operator: values.operator,
    value: values.value,
    value2: values.value2 || undefined,
    description: values.description || undefined,
    status: values.status
  })
})
</script>
