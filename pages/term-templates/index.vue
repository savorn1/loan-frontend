<template>
  <div>
    <PageHeader title="Term Templates" :description="totalLabel">
      <template #actions>
        <UButton icon="i-heroicons-plus" @click="openCreate">New Term Template</UButton>
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
            :icon="search ? 'i-heroicons-magnifying-glass' : 'i-heroicons-clock'"
            :title="search ? 'No matches' : 'No term templates yet'"
            :description="
              search
                ? `Nothing matches “${search}”.`
                : 'Add a reusable term (e.g. 12 months) that loan products can select.'
            "
          >
            <template v-if="!search" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">New Term Template</UButton>
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
          <span class="font-semibold">New Term Template</span>
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
          <span class="font-semibold">Edit Term Template</span>
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
      title="Delete this term template?"
      description="This permanently removes the term template and cannot be undone."
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
import type { TermTemplateRequest, TermTemplateResponse } from '~/features/loan-configuration/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

const api = useApi()

const {
  data: templates,
  pending,
  refresh
} = await useAsyncData('term-templates', () => api<TermTemplateResponse[]>('/term-templates'))

const columns: ColumnDef<TermTemplateResponse>[] = [
  { key: 'code', sortable: true },
  { key: 'name', sortable: true },
  { key: 'termValue', label: 'Term value', sortable: true },
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
  return count === 1 ? '1 term template' : `${count} term templates`
})

const fields: FieldDef[] = [
  { name: 'code', required: true, wrapper: 'half' },
  { name: 'name', required: true, wrapper: 'half' },
  {
    name: 'termValue',
    label: 'Term value',
    type: 'number',
    required: true,
    min: 1,
    wrapper: 'half'
  },
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
} = useCrudModals<TermTemplateResponse, TermTemplateRequest>('/term-templates', refresh, {
  entityName: 'Term template',
  createDefaults: () => ({ code: '', name: '', termValue: undefined, status: 'ACTIVE' }),
  toForm: (row) => ({
    code: row.code,
    name: row.name,
    termValue: row.termValue,
    status: row.status
  }),
  toPayload: (values) => ({
    code: values.code,
    name: values.name,
    termValue: values.termValue,
    status: values.status
  })
})
</script>
