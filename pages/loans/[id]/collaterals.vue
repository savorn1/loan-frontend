<template>
  <div>
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">{{ t('loans.collaterals.title') }}</span>
          <UButton v-if="isAdmin" size="xs" icon="i-heroicons-plus" @click="openCreate">{{
            t('loans.collaterals.add')
          }}</UButton>
        </div>
      </template>

      <UAlert
        v-if="fetchError"
        color="red"
        variant="subtle"
        class="mb-4"
        :title="apiErrorMessage(fetchError)"
      />

      <DataTable
        :rows="collaterals ?? []"
        :columns="columns"
        :loading="pending"
        numbered
        refreshable
        @refresh="refresh"
      >
        <template #actions-data="{ row }">
          <div v-if="isAdmin && row.status === 'PLEDGED'" class="flex gap-1 justify-end">
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
            <UButton
              size="2xs"
              variant="soft"
              :loading="releasing === row.id"
              @click="onRelease(row.id)"
            >
              {{ t('loans.collaterals.release') }}
            </UButton>
          </div>
        </template>
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-shield-check"
            :title="t('loans.collaterals.empty.title')"
            :description="t('loans.collaterals.empty.description')"
          >
            <template v-if="isAdmin" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">{{
                t('loans.collaterals.add')
              }}</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div
        v-if="totalPledged"
        class="pt-4 mt-2 border-t border-gray-200 dark:border-gray-800 text-sm flex justify-between"
      >
        <span class="text-gray-500">{{ t('loans.collaterals.totalPledged') }}</span>
        <span class="font-semibold">{{ formatCurrency(totalPledged) }}</span>
      </div>
    </UCard>

    <UModal v-model="showForm">
      <UCard>
        <template #header>
          <span class="font-semibold">{{
            formMode === 'create' ? t('loans.collaterals.add') : t('loans.collaterals.editTitle')
          }}</span>
        </template>
        <DynamicForm
          v-model="collateralForm"
          :fields="fields"
          :loading="submitting"
          :error="error"
          :submit-label="formMode === 'create' ? t('loans.collaterals.submit') : t('common.save')"
          cancelable
          @submit="onSubmitForm"
          @cancel="showForm = false"
        />
      </UCard>
    </UModal>

    <ConfirmModal
      :model-value="!!confirmDelete"
      :title="t('loans.collaterals.confirmDelete.title')"
      :description="t('loans.collaterals.confirmDelete.description')"
      :confirm-label="t('common.delete')"
      color="red"
      :loading="deleting"
      @update:model-value="
        (v: boolean) => {
          if (!v) confirmDelete = null
        }
      "
      @confirm="onConfirmDelete"
    />
  </div>
</template>

<script setup lang="ts">
import type { LoanCollateralRequest, LoanCollateralResponse } from '~/features/loans/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

const route = useRoute()
const api = useApi()
const toast = useToast()
const { isAdmin } = storeToRefs(useAuth())
const { t } = useI18n()

const loanId = route.params.id as string

const {
  data: collaterals,
  pending,
  error: fetchError,
  refresh
} = await useAsyncData(`loan-${loanId}-collaterals`, () =>
  api<LoanCollateralResponse[]>(`/loans/${loanId}/collaterals`)
)

const totalPledged = computed(() =>
  (collaterals.value ?? [])
    .filter((c) => c.status === 'PLEDGED')
    .reduce((sum, c) => sum + c.estimatedValue, 0)
)

const columns = computed<ColumnDef<LoanCollateralResponse>[]>(() => [
  { key: 'type', label: t('loans.collaterals.columns.type'), type: 'enum' },
  { key: 'description', label: t('loans.collaterals.columns.description') },
  { key: 'estimatedValue', label: t('loans.collaterals.columns.value'), type: 'currency' },
  { key: 'reference', label: t('loans.collaterals.columns.reference') },
  { key: 'status', label: t('loans.collaterals.columns.status'), type: 'status' },
  { key: 'createdAt', label: t('loans.collaterals.columns.created'), type: 'datetime' },
  { key: 'actions', label: t('loans.collaterals.columns.actions'), class: 'text-right' }
])

const fields = computed<FieldDef[]>(() => [
  {
    name: 'type',
    label: t('loans.collaterals.fields.type'),
    type: 'select',
    required: true,
    wrapper: 'half',
    options: [
      { label: t('loans.collaterals.typeOptions.realEstate'), value: 'REAL_ESTATE' },
      { label: t('loans.collaterals.typeOptions.vehicle'), value: 'VEHICLE' },
      { label: t('loans.collaterals.typeOptions.equipment'), value: 'EQUIPMENT' },
      { label: t('loans.collaterals.typeOptions.cashDeposit'), value: 'CASH_DEPOSIT' },
      { label: t('loans.collaterals.typeOptions.other'), value: 'OTHER' }
    ]
  },
  {
    name: 'estimatedValue',
    label: t('loans.collaterals.fields.estimatedValue'),
    type: 'currency',
    required: true,
    wrapper: 'half'
  },
  {
    name: 'description',
    label: t('loans.collaterals.fields.description'),
    type: 'textarea',
    required: true
  },
  { name: 'reference', label: t('loans.collaterals.fields.reference') }
])

const showForm = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const editingId = ref<number | null>(null)
const submitting = ref(false)
const releasing = ref<number | null>(null)
const error = ref('')
const collateralForm = ref<Record<string, any>>({})

function openCreate() {
  formMode.value = 'create'
  editingId.value = null
  collateralForm.value = {
    type: undefined,
    estimatedValue: undefined,
    description: '',
    reference: ''
  }
  error.value = ''
  showForm.value = true
}

function openEdit(row: LoanCollateralResponse) {
  formMode.value = 'edit'
  editingId.value = row.id
  collateralForm.value = {
    type: row.type,
    estimatedValue: row.estimatedValue,
    description: row.description,
    reference: row.reference ?? ''
  }
  error.value = ''
  showForm.value = true
}

async function onSubmitForm(values: Record<string, any>) {
  submitting.value = true
  error.value = ''
  try {
    const payload: LoanCollateralRequest = {
      type: values.type,
      description: values.description,
      estimatedValue: values.estimatedValue,
      reference: values.reference || undefined
    }
    if (formMode.value === 'create') {
      await api(`/loans/${loanId}/collaterals`, { method: 'POST', body: payload })
      toast.add({ title: t('loans.collaterals.toast.recorded'), color: 'green' })
    } else {
      await api(`/loans/${loanId}/collaterals/${editingId.value}`, { method: 'PUT', body: payload })
      toast.add({ title: t('loans.collaterals.toast.updated'), color: 'green' })
    }
    showForm.value = false
    await refresh()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    submitting.value = false
  }
}

const confirmDelete = ref<LoanCollateralResponse | null>(null)
const deleting = ref(false)

async function onConfirmDelete() {
  if (!confirmDelete.value) return
  deleting.value = true
  try {
    await api(`/loans/${loanId}/collaterals/${confirmDelete.value.id}`, { method: 'DELETE' })
    toast.add({ title: t('loans.collaterals.toast.deleted'), color: 'green' })
    confirmDelete.value = null
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    deleting.value = false
  }
}

async function onRelease(collateralId: number) {
  releasing.value = collateralId
  try {
    await api(`/loans/${loanId}/collaterals/${collateralId}/release`, { method: 'PUT' })
    toast.add({ title: t('loans.collaterals.toast.released'), color: 'green' })
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    releasing.value = null
  }
}
</script>
