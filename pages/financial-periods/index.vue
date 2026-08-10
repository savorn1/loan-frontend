<template>
  <div>
    <PageHeader :title="t('accounting.financialPeriods.title')" :description="totalLabel">
      <template #actions>
        <UButton icon="i-heroicons-plus" @click="openCreate">{{
          t('accounting.financialPeriods.newFinancialPeriod')
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
              v-if="row.status === 'OPEN'"
              size="2xs"
              variant="soft"
              icon="i-heroicons-lock-closed"
              :title="t('accounting.financialPeriods.closePeriod')"
              :aria-label="t('accounting.financialPeriods.closePeriod')"
              @click="confirmClose = row"
            />
            <UButton
              v-if="row.status === 'OPEN'"
              size="2xs"
              variant="soft"
              icon="i-heroicons-pencil"
              :aria-label="t('common.edit')"
              @click="openEdit(row)"
            />
            <UButton
              v-if="row.status === 'OPEN'"
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
            icon="i-heroicons-calendar-days"
            :title="t('accounting.financialPeriods.emptyTitle')"
            :description="t('accounting.financialPeriods.emptyDescription')"
          >
            <template #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">{{
                t('accounting.financialPeriods.newFinancialPeriod')
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
            t('accounting.financialPeriods.newFinancialPeriod')
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

    <UModal v-model="showEdit">
      <UCard>
        <template #header>
          <span class="font-semibold">{{
            t('accounting.financialPeriods.editFinancialPeriod')
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
          ? t('accounting.financialPeriods.deleteConfirmTitle', { name: confirmDelete.periodName })
          : ''
      "
      :description="t('accounting.financialPeriods.deleteConfirmDescription')"
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

    <ConfirmModal
      :model-value="confirmClose !== null"
      :title="
        confirmClose
          ? t('accounting.financialPeriods.closePeriodConfirmTitle', {
              name: confirmClose.periodName
            })
          : ''
      "
      :description="t('accounting.financialPeriods.closePeriodConfirmDescription')"
      :confirm-label="t('accounting.financialPeriods.closePeriod')"
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

const { t } = useI18n()
const api = useApi()
const toast = useToast()

const {
  data: periods,
  pending,
  error: fetchError,
  refresh
} = await useAsyncData('financial-periods', () =>
  api<FinancialPeriodResponse[]>('/financial-periods')
)

const columns = computed<ColumnDef<FinancialPeriodResponse>[]>(() => [
  { key: 'periodName', label: t('accounting.financialPeriods.columns.period'), sortable: true },
  { key: 'startDate', type: 'date', to: 'endDate', sortable: true },
  {
    key: 'status',
    label: t('accounting.financialPeriods.columns.status'),
    type: 'status',
    sortable: true
  },
  { key: 'actions', label: '', class: 'text-right' }
])

const { page, pageSize, sort, total, rows } = useClientTable(periods, { pageSize: 15 })

const totalLabel = computed(() => {
  const count = periods.value?.length ?? 0
  return count === 1
    ? t('accounting.financialPeriods.totalLabelOne')
    : t('accounting.financialPeriods.totalLabelOther', { count })
})

const fields = computed<FieldDef[]>(() => [
  {
    name: 'periodName',
    label: t('accounting.financialPeriods.fields.periodName'),
    required: true,
    maxLength: 20,
    placeholder: t('accounting.financialPeriods.fields.periodNamePlaceholder'),
    wrapper: 'full'
  },
  {
    name: 'startDate',
    label: t('accounting.financialPeriods.fields.startDate'),
    type: 'date',
    required: true,
    wrapper: 'half'
  },
  {
    name: 'endDate',
    label: t('accounting.financialPeriods.fields.endDate'),
    type: 'date',
    required: true,
    wrapper: 'half'
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
} = useCrudModals<FinancialPeriodResponse, FinancialPeriodRequest>('/financial-periods', refresh, {
  entityName: t('accounting.entities.financialPeriod'),
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
    toast.add({ title: t('accounting.financialPeriods.periodClosed'), color: 'green' })
    confirmClose.value = null
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    closing.value = false
  }
}
</script>
