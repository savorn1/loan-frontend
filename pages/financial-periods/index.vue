<template>
  <div>
    <PageHeader title="Financial Periods" :description="totalLabel">
      <template #actions>
        <UButton icon="i-heroicons-plus" @click="openCreate">New Financial Period</UButton>
      </template>
    </PageHeader>

    <UCard>
      <DataTable v-model:sort="sort" :rows="rows" :columns="columns" :loading="pending">
        <template #actions-data="{ row }">
          <div class="flex gap-1 justify-end">
            <UButton
              v-if="row.status === 'OPEN'"
              size="2xs"
              variant="soft"
              icon="i-heroicons-lock-closed"
              title="Close period"
              @click="confirmClose = row"
            />
            <UButton
              v-if="row.status === 'OPEN'"
              size="2xs"
              variant="soft"
              icon="i-heroicons-pencil"
              @click="openEdit(row)"
            />
            <UButton
              v-if="row.status === 'OPEN'"
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
            icon="i-heroicons-calendar-days"
            title="No financial periods yet"
            description="Every journal entry posts against the period covering its transaction date."
          >
            <template #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">New Financial Period</UButton>
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
          <span class="font-semibold">New Financial Period</span>
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
          <span class="font-semibold">Edit Financial Period</span>
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
      title="Delete this financial period?"
      description="This permanently removes the period and cannot be undone."
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

    <ConfirmModal
      :model-value="confirmClose !== null"
      title="Close this financial period?"
      description="Once closed, no new journal entries can be posted or reversed against this period. This cannot be undone."
      confirm-label="Close period"
      color="orange"
      :loading="closing"
      @update:model-value="
        (v: boolean) => {
          if (!v) confirmClose = null
        }
      "
      @confirm="onClose"
    />
  </div>
</template>

<script setup lang="ts">
import type { FinancialPeriodRequest, FinancialPeriodResponse } from '~/features/accounting/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

const api = useApi()
const toast = useToast()

const {
  data: periods,
  pending,
  refresh
} = await useAsyncData('financial-periods', () =>
  api<FinancialPeriodResponse[]>('/financial-periods')
)

const columns: ColumnDef<FinancialPeriodResponse>[] = [
  { key: 'periodName', label: 'Period', sortable: true },
  { key: 'startDate', type: 'date', to: 'endDate', sortable: true },
  { key: 'status', type: 'status', sortable: true },
  { key: 'actions', label: '', class: 'text-right' }
]

const { page, pageSize, sort, total, rows } = useClientTable(periods, { pageSize: 15 })

const totalLabel = computed(() => {
  const count = periods.value?.length ?? 0
  return count === 1 ? '1 financial period' : `${count} financial periods`
})

const fields: FieldDef[] = [
  {
    name: 'periodName',
    label: 'Period name',
    required: true,
    placeholder: 'e.g. 2026-07',
    wrapper: 'full'
  },
  { name: 'startDate', label: 'Start date', type: 'date', required: true, wrapper: 'half' },
  { name: 'endDate', label: 'End date', type: 'date', required: true, wrapper: 'half' }
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
} = useCrudModals<FinancialPeriodResponse, FinancialPeriodRequest>('/financial-periods', refresh, {
  entityName: 'Financial period',
  createDefaults: () => ({ periodName: '', startDate: '', endDate: '' }),
  toForm: (row) => ({ periodName: row.periodName, startDate: row.startDate, endDate: row.endDate }),
  toPayload: (values) => ({
    periodName: values.periodName,
    startDate: values.startDate,
    endDate: values.endDate
  })
})

const closing = ref(false)
const confirmClose = ref<FinancialPeriodResponse | null>(null)

async function onClose() {
  if (!confirmClose.value) return
  closing.value = true
  try {
    await api(`/financial-periods/${confirmClose.value.id}/close`, { method: 'POST' })
    toast.add({ title: 'Financial period closed', color: 'green' })
    confirmClose.value = null
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    closing.value = false
  }
}
</script>
