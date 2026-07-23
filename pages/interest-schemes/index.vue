<template>
  <div>
    <PageHeader title="Interest Schemes" :description="totalLabel">
      <template #actions>
        <UButton icon="i-heroicons-plus" @click="openCreate">New Interest Scheme</UButton>
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
            :icon="search ? 'i-heroicons-magnifying-glass' : 'i-heroicons-chart-bar-square'"
            :title="search ? 'No matches' : 'No interest schemes yet'"
            :description="search ? `Nothing matches “${search}”.` : 'Add a reusable interest scheme (e.g. Standard Reducing Balance) that loan products can select.'"
          >
            <template v-if="!search" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">New Interest Scheme</UButton>
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
          <span class="font-semibold">New Interest Scheme</span>
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
          <span class="font-semibold">Edit Interest Scheme</span>
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
      title="Delete this interest scheme?"
      description="This permanently removes the interest scheme and cannot be undone."
      confirm-label="Delete"
      color="red"
      :loading="deleting"
      @update:model-value="(v: boolean) => { if (!v) confirmDelete = null }"
      @confirm="onDelete"
    />
  </div>
</template>

<script setup lang="ts">
import type { InterestSchemeRequest, InterestSchemeResponse } from '~/features/loan-configuration/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

const api = useApi()

const { data: schemes, pending, refresh } = await useAsyncData('interest-schemes', () => api<InterestSchemeResponse[]>('/interest-schemes'))

const columns: ColumnDef<InterestSchemeResponse>[] = [
  { key: 'code', sortable: true },
  { key: 'name', sortable: true },
  { key: 'interestType', label: 'Type', type: 'enum', sortable: true },
  { key: 'calculationMethod', label: 'Calculation', type: 'enum', sortable: true },
  { key: 'status', type: 'status', sortable: true },
  { key: 'createdAt', label: 'Created', type: 'datetime', sortable: true },
  { key: 'actions', label: '', class: 'text-right' }
]

const { search, page, pageSize, sort, total, rows } = useClientTable(schemes, {
  searchFields: ['name', 'code'],
  pageSize: 10
})

const totalLabel = computed(() => {
  const count = schemes.value?.length ?? 0
  return count === 1 ? '1 interest scheme' : `${count} interest schemes`
})

const fields: FieldDef[] = [
  { name: 'code', required: true, wrapper: 'half' },
  { name: 'name', required: true, wrapper: 'half' },
  {
    name: 'interestType',
    label: 'Interest type',
    type: 'select',
    required: true,
    wrapper: 'half',
    options: [
      { label: 'Flat', value: 'FLAT' },
      { label: 'Reducing balance', value: 'REDUCING' }
    ]
  },
  {
    name: 'calculationMethod',
    label: 'Day-count convention',
    type: 'select',
    required: true,
    wrapper: 'half',
    options: [
      { label: 'Actual/365', value: 'ACTUAL_365' },
      { label: 'Actual/360', value: 'ACTUAL_360' },
      { label: '30/360', value: 'THIRTY_360' }
    ]
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
  showCreate, creating, error, createForm, openCreate, onCreate,
  showEdit, editing, editError, editForm, openEdit, onEdit,
  deleting, confirmDelete, onDelete
} = useCrudModals<InterestSchemeResponse, InterestSchemeRequest>('/interest-schemes', refresh, {
  entityName: 'Interest scheme',
  createDefaults: () => ({ code: '', name: '', interestType: undefined, calculationMethod: undefined, status: 'ACTIVE' }),
  toForm: row => ({
    code: row.code,
    name: row.name,
    interestType: row.interestType,
    calculationMethod: row.calculationMethod,
    status: row.status
  }),
  toPayload: values => ({
    code: values.code,
    name: values.name,
    interestType: values.interestType,
    calculationMethod: values.calculationMethod,
    status: values.status
  })
})
</script>
