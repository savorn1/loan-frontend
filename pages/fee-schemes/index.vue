<template>
  <div>
    <PageHeader :title="t('loanConfig.feeSchemes.title')" :description="totalLabel">
      <template #actions>
        <UButton icon="i-heroicons-plus" @click="openCreate">{{
          t('loanConfig.feeSchemes.newFeeScheme')
        }}</UButton>
      </template>
    </PageHeader>

    <UCard>
      <template #header>
        <UInput
          v-model="search"
          icon="i-heroicons-magnifying-glass"
          :placeholder="t('loanConfig.shared.searchByNameOrCode')"
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
              icon="i-heroicons-list-bullet"
              :aria-label="t('loanConfig.feeSchemes.details.manageButton')"
              @click="openDetails(row)"
            />
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
            :icon="search ? 'i-heroicons-magnifying-glass' : 'i-heroicons-currency-dollar'"
            :title="search ? t('common.noMatches') : t('loanConfig.feeSchemes.emptyTitle')"
            :description="
              search
                ? t('common.nothingMatches', { query: search })
                : t('loanConfig.feeSchemes.emptyDescription')
            "
          >
            <template v-if="!search" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">{{
                t('loanConfig.feeSchemes.newFeeScheme')
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
          <span class="font-semibold">{{ t('loanConfig.feeSchemes.newFeeScheme') }}</span>
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
          <span class="font-semibold">{{ t('loanConfig.feeSchemes.editHeader') }}</span>
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
        confirmDelete ? t('loanConfig.feeSchemes.deleteTitle', { name: confirmDelete.name }) : ''
      "
      :description="t('loanConfig.feeSchemes.deleteDescription')"
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

    <UModal v-model="showDetails" :ui="{ width: 'sm:max-w-2xl' }">
      <UCard v-if="detailsScheme">
        <template #header>
          <span class="font-semibold">{{
            t('loanConfig.feeSchemes.details.title', { name: detailsScheme.name })
          }}</span>
        </template>

        <DataTable
          :rows="details"
          :columns="detailColumns"
          :loading="detailsLoading"
          numbered
          class="mb-6"
        >
          <template #actions-data="{ row }">
            <div class="flex gap-1 justify-end">
              <UButton
                size="2xs"
                variant="soft"
                icon="i-heroicons-pencil"
                :aria-label="t('common.edit')"
                @click="openEditDetail(row)"
              />
              <UButton
                size="2xs"
                color="red"
                variant="soft"
                icon="i-heroicons-trash"
                :aria-label="t('common.delete')"
                @click="confirmDeleteDetail = row"
              />
            </div>
          </template>
          <template #empty-state>
            <EmptyState
              icon="i-heroicons-currency-dollar"
              :title="t('loanConfig.feeSchemes.details.emptyTitle')"
              :description="t('loanConfig.feeSchemes.details.emptyDescription')"
            />
          </template>
        </DataTable>

        <h4 class="text-sm font-medium mb-2">
          {{
            editingDetailId
              ? t('loanConfig.feeSchemes.details.editHeader')
              : t('loanConfig.feeSchemes.details.addHeader')
          }}
        </h4>
        <DynamicForm
          v-model="detailForm"
          :fields="detailFields"
          :loading="savingDetail"
          :error="detailError"
          :submit-label="
            editingDetailId ? t('common.saveChanges') : t('loanConfig.feeSchemes.details.addButton')
          "
          cancelable
          @submit="onSubmitDetail"
          @cancel="cancelDetails"
        />
      </UCard>
    </UModal>

    <ConfirmModal
      :model-value="confirmDeleteDetail !== null"
      :title="t('loanConfig.feeSchemes.details.deleteTitle')"
      :description="t('loanConfig.feeSchemes.details.deleteDescription')"
      :confirm-label="t('common.delete')"
      color="red"
      :loading="deletingDetail"
      @update:model-value="
        (v: boolean) => {
          if (!v) confirmDeleteDetail = null
        }
      "
      @confirm="onDeleteDetail"
    />
  </div>
</template>

<script setup lang="ts">
import type {
  FeeSchemeDetailRequest,
  FeeSchemeDetailResponse,
  FeeSchemeRequest,
  FeeSchemeResponse
} from '~/features/loan-configuration/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

const { t } = useI18n()
const api = useApi()
const toast = useToast()

const {
  data: schemes,
  pending,
  error: fetchError,
  refresh
} = await useAsyncData('fee-schemes', () => api<FeeSchemeResponse[]>('/fee-schemes'))

const columns = computed<ColumnDef<FeeSchemeResponse>[]>(() => [
  { key: 'code', label: t('loanConfig.shared.codeColumn'), sortable: true },
  { key: 'name', label: t('loanConfig.shared.nameColumn'), sortable: true },
  { key: 'status', label: t('loanConfig.shared.statusColumn'), type: 'status', sortable: true },
  {
    key: 'createdAt',
    label: t('loanConfig.shared.createdColumn'),
    type: 'datetime',
    sortable: true
  },
  { key: 'actions', label: '', class: 'text-right' }
])

const { search, page, pageSize, sort, total, rows } = useClientTable(schemes, {
  searchFields: ['name', 'code'],
  pageSize: 10
})

const totalLabel = computed(() => {
  const count = schemes.value?.length ?? 0
  return count === 1
    ? t('loanConfig.feeSchemes.total.one')
    : t('loanConfig.feeSchemes.total.other', { count })
})

const fields = computed<FieldDef[]>(() => [
  { name: 'code', label: t('loanConfig.shared.codeColumn'), required: true, wrapper: 'half' },
  { name: 'name', label: t('loanConfig.shared.nameColumn'), required: true, wrapper: 'half' },
  {
    name: 'status',
    label: t('loanConfig.shared.statusColumn'),
    type: 'select',
    required: true,
    default: 'ACTIVE',
    wrapper: 'half',
    options: [
      { label: t('common.active'), value: 'ACTIVE' },
      { label: t('common.inactive'), value: 'INACTIVE' }
    ]
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
} = useCrudModals<FeeSchemeResponse, FeeSchemeRequest>('/fee-schemes', refresh, {
  entityName: t('loanConfig.entities.feeScheme'),
  createDefaults: () => ({ code: '', name: '', status: 'ACTIVE' }),
  toForm: (row) => ({ code: row.code, name: row.name, status: row.status }),
  toPayload: (values) => ({ code: values.code, name: values.name, status: values.status })
})

// ── Fee line items (fee_scheme_details) — nested under a scheme, so this manages
// its own CRUD state instead of useCrudModals (built for a single fixed basePath).
const showDetails = ref(false)
const detailsScheme = ref<FeeSchemeResponse | null>(null)
const details = ref<FeeSchemeDetailResponse[]>([])
const detailsLoading = ref(false)

const detailColumns = computed<ColumnDef<FeeSchemeDetailResponse>[]>(() => [
  { key: 'type', label: t('loanConfig.shared.typeColumn'), type: 'enum' },
  {
    key: 'calculationMethod',
    label: t('loanConfig.feeSchemes.details.calculationMethodColumn'),
    type: 'enum'
  },
  { key: 'amount', label: t('loanConfig.shared.valueColumn') },
  {
    key: 'chargeTiming',
    label: t('loanConfig.feeSchemes.details.chargeTimingColumn'),
    type: 'enum'
  },
  { key: 'actions', label: '', class: 'text-right' }
])

async function openDetails(row: FeeSchemeResponse) {
  detailsScheme.value = row
  resetDetailForm()
  showDetails.value = true
  await refreshDetails()
}

async function refreshDetails() {
  if (!detailsScheme.value) return
  detailsLoading.value = true
  try {
    details.value = await api<FeeSchemeDetailResponse[]>(
      `/fee-schemes/${detailsScheme.value.id}/details`
    )
  } finally {
    detailsLoading.value = false
  }
}

const detailFields = computed<FieldDef[]>(() => [
  {
    name: 'type',
    label: t('loanConfig.shared.typeColumn'),
    type: 'select',
    required: true,
    wrapper: 'half',
    options: [
      { label: t('loanConfig.feeSchemes.details.typeOptions.origination'), value: 'ORIGINATION' },
      { label: t('loanConfig.feeSchemes.details.typeOptions.processing'), value: 'PROCESSING' },
      { label: t('loanConfig.feeSchemes.details.typeOptions.latePayment'), value: 'LATE_PAYMENT' },
      { label: t('loanConfig.feeSchemes.details.typeOptions.prepayment'), value: 'PREPAYMENT' },
      { label: t('loanConfig.feeSchemes.details.typeOptions.other'), value: 'OTHER' }
    ]
  },
  {
    name: 'calculationMethod',
    label: t('loanConfig.feeSchemes.details.calculationMethodColumn'),
    type: 'select',
    required: true,
    wrapper: 'half',
    options: [
      { label: t('loanConfig.feeSchemes.details.calculationOptions.flat'), value: 'FLAT' },
      {
        label: t('loanConfig.feeSchemes.details.calculationOptions.percentage'),
        value: 'PERCENTAGE'
      }
    ]
  },
  {
    name: 'amount',
    label: t('loanConfig.shared.valueColumn'),
    type: 'number',
    required: true,
    min: 0,
    step: 0.01,
    hint: t('loanConfig.feeSchemes.details.amountHint'),
    wrapper: 'half'
  },
  {
    name: 'chargeTiming',
    label: t('loanConfig.feeSchemes.details.chargeTimingColumn'),
    type: 'select',
    required: true,
    wrapper: 'half',
    options: [
      { label: t('loanConfig.feeSchemes.details.timingOptions.upfront'), value: 'UPFRONT' },
      {
        label: t('loanConfig.feeSchemes.details.timingOptions.onDisbursement'),
        value: 'ON_DISBURSEMENT'
      },
      { label: t('loanConfig.feeSchemes.details.timingOptions.recurring'), value: 'RECURRING' }
    ]
  }
])

const detailForm = ref<Record<string, any>>({})
const editingDetailId = ref<string | null>(null)
const savingDetail = ref(false)
const detailError = ref('')

function resetDetailForm() {
  editingDetailId.value = null
  detailForm.value = {
    type: undefined,
    calculationMethod: undefined,
    amount: undefined,
    chargeTiming: undefined
  }
  detailError.value = ''
}

// Cancel on the line-item form closes the whole modal (not just the form) —
// resetDetailForm() alone is also reused after a successful add/edit, where
// staying open to add another item is the point.
function cancelDetails() {
  resetDetailForm()
  showDetails.value = false
}

function openEditDetail(row: FeeSchemeDetailResponse) {
  editingDetailId.value = row.id
  detailForm.value = {
    type: row.type,
    calculationMethod: row.calculationMethod,
    amount: row.amount,
    chargeTiming: row.chargeTiming
  }
  detailError.value = ''
}

async function onSubmitDetail(values: Record<string, any>) {
  if (!detailsScheme.value) return
  savingDetail.value = true
  detailError.value = ''
  try {
    const payload: FeeSchemeDetailRequest = {
      type: values.type,
      calculationMethod: values.calculationMethod,
      amount: values.amount,
      chargeTiming: values.chargeTiming
    }
    const entity = t('loanConfig.entities.feeSchemeDetail')
    if (editingDetailId.value) {
      await api(`/fee-schemes/${detailsScheme.value.id}/details/${editingDetailId.value}`, {
        method: 'PUT',
        body: payload
      })
      toast.add({ title: t('common.entityUpdated', { entity }), color: 'green' })
    } else {
      await api(`/fee-schemes/${detailsScheme.value.id}/details`, { method: 'POST', body: payload })
      toast.add({ title: t('common.entityCreated', { entity }), color: 'green' })
    }
    resetDetailForm()
    await refreshDetails()
  } catch (err) {
    detailError.value = apiErrorMessage(err)
  } finally {
    savingDetail.value = false
  }
}

const confirmDeleteDetail = ref<FeeSchemeDetailResponse | null>(null)
const deletingDetail = ref(false)

async function onDeleteDetail() {
  if (!confirmDeleteDetail.value || !detailsScheme.value) return
  deletingDetail.value = true
  try {
    await api(`/fee-schemes/${detailsScheme.value.id}/details/${confirmDeleteDetail.value.id}`, {
      method: 'DELETE'
    })
    toast.add({
      title: t('common.entityDeleted', { entity: t('loanConfig.entities.feeSchemeDetail') }),
      color: 'green'
    })
    confirmDeleteDetail.value = null
    await refreshDetails()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    deletingDetail.value = false
  }
}
</script>
