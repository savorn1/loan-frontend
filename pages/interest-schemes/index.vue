<template>
  <div>
    <PageHeader :title="t('loanConfig.interestSchemes.title')" :description="totalLabel">
      <template #actions>
        <UButton icon="i-heroicons-plus" @click="openCreate">{{
          t('loanConfig.interestSchemes.newInterestScheme')
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
              :aria-label="t('loanConfig.interestSchemes.details.manageButton')"
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
            :icon="search ? 'i-heroicons-magnifying-glass' : 'i-heroicons-chart-bar-square'"
            :title="search ? t('common.noMatches') : t('loanConfig.interestSchemes.emptyTitle')"
            :description="
              search
                ? t('common.nothingMatches', { query: search })
                : t('loanConfig.interestSchemes.emptyDescription')
            "
          >
            <template v-if="!search" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">{{
                t('loanConfig.interestSchemes.newInterestScheme')
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
          <span class="font-semibold">{{ t('loanConfig.interestSchemes.newInterestScheme') }}</span>
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
          <span class="font-semibold">{{ t('loanConfig.interestSchemes.editHeader') }}</span>
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
          ? t('loanConfig.interestSchemes.deleteTitle', { name: confirmDelete.name })
          : ''
      "
      :description="t('loanConfig.interestSchemes.deleteDescription')"
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
            t('loanConfig.interestSchemes.details.title', { name: detailsScheme.name })
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
              icon="i-heroicons-chart-bar-square"
              :title="t('loanConfig.interestSchemes.details.emptyTitle')"
              :description="t('loanConfig.interestSchemes.details.emptyDescription')"
            />
          </template>
        </DataTable>

        <h4 class="text-sm font-medium mb-2">
          {{
            editingDetailId
              ? t('loanConfig.interestSchemes.details.editHeader')
              : t('loanConfig.interestSchemes.details.addHeader')
          }}
        </h4>
        <DynamicForm
          v-model="detailForm"
          :fields="detailFields"
          :loading="savingDetail"
          :error="detailError"
          :submit-label="
            editingDetailId
              ? t('common.saveChanges')
              : t('loanConfig.interestSchemes.details.addButton')
          "
          cancelable
          @submit="onSubmitDetail"
          @cancel="cancelDetails"
        />
      </UCard>
    </UModal>

    <ConfirmModal
      :model-value="confirmDeleteDetail !== null"
      :title="t('loanConfig.interestSchemes.details.deleteTitle')"
      :description="t('loanConfig.interestSchemes.details.deleteDescription')"
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
  InterestSchemeDetailRequest,
  InterestSchemeDetailResponse,
  InterestSchemeRequest,
  InterestSchemeResponse
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
} = await useAsyncData('interest-schemes', () => api<InterestSchemeResponse[]>('/interest-schemes'))

const columns = computed<ColumnDef<InterestSchemeResponse>[]>(() => [
  { key: 'code', label: t('loanConfig.shared.codeColumn'), sortable: true },
  { key: 'name', label: t('loanConfig.shared.nameColumn'), sortable: true },
  {
    key: 'interestType',
    label: t('loanConfig.shared.typeColumn'),
    type: 'enum',
    sortable: true
  },
  {
    key: 'calculationMethod',
    label: t('loanConfig.interestSchemes.calculationColumn'),
    type: 'enum',
    sortable: true
  },
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
    ? t('loanConfig.interestSchemes.total.one')
    : t('loanConfig.interestSchemes.total.other', { count })
})

const fields = computed<FieldDef[]>(() => [
  { name: 'code', label: t('loanConfig.shared.codeColumn'), required: true, wrapper: 'half' },
  { name: 'name', label: t('loanConfig.shared.nameColumn'), required: true, wrapper: 'half' },
  {
    name: 'interestType',
    label: t('loanConfig.interestSchemes.interestTypeFieldLabel'),
    type: 'select',
    required: true,
    wrapper: 'half',
    options: [
      { label: t('loanConfig.interestSchemes.optionFlat'), value: 'FLAT' },
      { label: t('loanConfig.interestSchemes.optionReducingBalance'), value: 'REDUCING' }
    ]
  },
  {
    name: 'calculationMethod',
    label: t('loanConfig.interestSchemes.calculationMethodFieldLabel'),
    type: 'select',
    required: true,
    wrapper: 'half',
    options: [
      { label: t('loanConfig.interestSchemes.optionActual365'), value: 'ACTUAL_365' },
      { label: t('loanConfig.interestSchemes.optionActual360'), value: 'ACTUAL_360' },
      { label: t('loanConfig.interestSchemes.optionThirty360'), value: 'THIRTY_360' }
    ]
  },
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
} = useCrudModals<InterestSchemeResponse, InterestSchemeRequest>('/interest-schemes', refresh, {
  entityName: t('loanConfig.entities.interestScheme'),
  createDefaults: () => ({
    code: '',
    name: '',
    interestType: undefined,
    calculationMethod: undefined,
    status: 'ACTIVE'
  }),
  toForm: (row) => ({
    code: row.code,
    name: row.name,
    interestType: row.interestType,
    calculationMethod: row.calculationMethod,
    status: row.status
  }),
  toPayload: (values) => ({
    code: values.code,
    name: values.name,
    interestType: values.interestType,
    calculationMethod: values.calculationMethod,
    status: values.status
  })
})

// ── Rate tiers (interest_scheme_details) — nested under a scheme, so this
// manages its own CRUD state instead of useCrudModals (built for a fixed basePath).
const showDetails = ref(false)
const detailsScheme = ref<InterestSchemeResponse | null>(null)
const details = ref<InterestSchemeDetailResponse[]>([])
const detailsLoading = ref(false)

const detailColumns = computed<ColumnDef<InterestSchemeDetailResponse>[]>(() => [
  { key: 'minTerm', label: t('loanConfig.interestSchemes.details.minTermColumn') },
  { key: 'maxTerm', label: t('loanConfig.interestSchemes.details.maxTermColumn') },
  { key: 'minAmount', label: t('loanConfig.interestSchemes.details.minAmountColumn') },
  { key: 'maxAmount', label: t('loanConfig.interestSchemes.details.maxAmountColumn') },
  {
    key: 'interestRate',
    label: t('loanConfig.interestSchemes.details.interestRateColumn'),
    type: 'percent'
  },
  { key: 'actions', label: '', class: 'text-right' }
])

async function openDetails(row: InterestSchemeResponse) {
  detailsScheme.value = row
  resetDetailForm()
  showDetails.value = true
  await refreshDetails()
}

async function refreshDetails() {
  if (!detailsScheme.value) return
  detailsLoading.value = true
  try {
    details.value = await api<InterestSchemeDetailResponse[]>(
      `/interest-schemes/${detailsScheme.value.id}/details`
    )
  } finally {
    detailsLoading.value = false
  }
}

const detailFields = computed<FieldDef[]>(() => [
  {
    name: 'minTerm',
    label: t('loanConfig.interestSchemes.details.minTermColumn'),
    type: 'number',
    required: true,
    min: 0,
    hint: t('loanConfig.interestSchemes.details.termHint'),
    wrapper: 'half'
  },
  {
    name: 'maxTerm',
    label: t('loanConfig.interestSchemes.details.maxTermColumn'),
    type: 'number',
    required: true,
    min: 0,
    wrapper: 'half'
  },
  {
    name: 'minAmount',
    label: t('loanConfig.interestSchemes.details.minAmountColumn'),
    type: 'currency',
    required: true,
    wrapper: 'half'
  },
  {
    name: 'maxAmount',
    label: t('loanConfig.interestSchemes.details.maxAmountColumn'),
    type: 'currency',
    required: true,
    wrapper: 'half'
  },
  {
    name: 'interestRate',
    label: t('loanConfig.interestSchemes.details.interestRateColumn'),
    type: 'number',
    required: true,
    suffix: '%',
    min: 0,
    max: 100,
    step: 0.01,
    wrapper: 'half'
  }
])

const detailForm = ref<Record<string, any>>({})
const editingDetailId = ref<string | null>(null)
const savingDetail = ref(false)
const detailError = ref('')

function resetDetailForm() {
  editingDetailId.value = null
  detailForm.value = {
    minTerm: undefined,
    maxTerm: undefined,
    minAmount: undefined,
    maxAmount: undefined,
    interestRate: undefined
  }
  detailError.value = ''
}

// Cancel on the rate-tier form closes the whole modal (not just the form) —
// resetDetailForm() alone is also reused after a successful add/edit, where
// staying open to add another tier is the point.
function cancelDetails() {
  resetDetailForm()
  showDetails.value = false
}

function openEditDetail(row: InterestSchemeDetailResponse) {
  editingDetailId.value = row.id
  detailForm.value = {
    minTerm: row.minTerm,
    maxTerm: row.maxTerm,
    minAmount: row.minAmount,
    maxAmount: row.maxAmount,
    interestRate: row.interestRate
  }
  detailError.value = ''
}

async function onSubmitDetail(values: Record<string, any>) {
  if (!detailsScheme.value) return
  savingDetail.value = true
  detailError.value = ''
  try {
    const payload: InterestSchemeDetailRequest = {
      minTerm: values.minTerm,
      maxTerm: values.maxTerm,
      minAmount: values.minAmount,
      maxAmount: values.maxAmount,
      interestRate: values.interestRate
    }
    const entity = t('loanConfig.entities.interestSchemeDetail')
    if (editingDetailId.value) {
      await api(`/interest-schemes/${detailsScheme.value.id}/details/${editingDetailId.value}`, {
        method: 'PUT',
        body: payload
      })
      toast.add({ title: t('common.entityUpdated', { entity }), color: 'green' })
    } else {
      await api(`/interest-schemes/${detailsScheme.value.id}/details`, {
        method: 'POST',
        body: payload
      })
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

const confirmDeleteDetail = ref<InterestSchemeDetailResponse | null>(null)
const deletingDetail = ref(false)

async function onDeleteDetail() {
  if (!confirmDeleteDetail.value || !detailsScheme.value) return
  deletingDetail.value = true
  try {
    await api(
      `/interest-schemes/${detailsScheme.value.id}/details/${confirmDeleteDetail.value.id}`,
      { method: 'DELETE' }
    )
    toast.add({
      title: t('common.entityDeleted', { entity: t('loanConfig.entities.interestSchemeDetail') }),
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
