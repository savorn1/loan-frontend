<template>
  <div>
    <PageHeader :title="t('loanConfig.loanProducts.title')" :description="totalLabel">
      <template #actions>
        <UButton icon="i-heroicons-plus" @click="openCreate">{{
          t('loanConfig.loanProducts.newLoanProduct')
        }}</UButton>
      </template>
    </PageHeader>

    <UCard>
      <template #header>
        <div class="flex flex-wrap items-center gap-3">
          <UInput
            v-model="search"
            icon="i-heroicons-magnifying-glass"
            :placeholder="t('loanConfig.shared.searchByNameOrCode')"
            class="max-w-xs w-full sm:w-auto"
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
          <USelectMenu
            v-model="statusFilter"
            :options="statusOptions"
            option-attribute="label"
            value-attribute="value"
            class="w-40"
          />
        </div>
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
            <UButton size="2xs" variant="soft" icon="i-heroicons-pencil" :aria-label="t('common.edit')" @click="openEdit(row)" />
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
            :icon="
              hasFilters ? 'i-heroicons-magnifying-glass' : 'i-heroicons-clipboard-document-list'
            "
            :title="hasFilters ? t('common.noMatches') : t('loanConfig.loanProducts.emptyTitle')"
            :description="
              hasFilters
                ? t('loanConfig.loanProducts.emptyDescriptionFiltered')
                : t('loanConfig.loanProducts.emptyDescription')
            "
          >
            <template v-if="!hasFilters" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">{{
                t('loanConfig.loanProducts.newLoanProduct')
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
          <span class="font-semibold">{{ t('loanConfig.loanProducts.newLoanProduct') }}</span>
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
          <span class="font-semibold">{{ t('loanConfig.loanProducts.editHeader') }}</span>
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
      :title="t('loanConfig.loanProducts.deleteTitle')"
      :description="
        t('loanConfig.loanProducts.deleteDescription', {
          name: confirmDelete?.name ?? t('loanConfig.loanProducts.deleteFallbackName')
        })
      "
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
  LoanProductRequest,
  LoanProductResponse,
  LoanProductStatus
} from '~/features/loan-products/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

const { t } = useI18n()
const api = useApi()

const {
  data: products,
  pending,
  error: fetchError,
  refresh
} = await useAsyncData('loan-products', () => api<LoanProductResponse[]>('/loan-products'))

const columns = computed<ColumnDef<LoanProductResponse>[]>(() => [
  { key: 'code', label: t('loanConfig.shared.codeColumn'), sortable: true },
  { key: 'name', label: t('loanConfig.shared.nameColumn'), sortable: true },
  { key: 'loanType', label: t('loanConfig.shared.typeColumn'), type: 'enum', sortable: true },
  {
    key: 'minAmount',
    label: t('loanConfig.loanProducts.amountRangeColumn'),
    type: 'currency',
    to: 'maxAmount',
    prefix: (row) => `${row.currency} `
  },
  {
    key: 'minTerm',
    label: t('loanConfig.loanProducts.termRangeColumn'),
    to: 'maxTerm'
  },
  {
    key: 'effectiveFrom',
    label: t('loanConfig.shared.effectiveFromLabel'),
    type: 'date',
    sortable: true
  },
  { key: 'status', label: t('loanConfig.shared.statusColumn'), type: 'status', sortable: true },
  { key: 'actions', label: '', class: 'text-right' }
])

const statusOptions = computed<{ label: string; value: LoanProductStatus | '' }[]>(() => [
  { label: t('loanConfig.loanProducts.statusFilterAll'), value: '' },
  { label: t('loanConfig.loanProducts.statusDraft'), value: 'DRAFT' },
  { label: t('loanConfig.loanProducts.statusPublished'), value: 'PUBLISHED' },
  { label: t('common.inactive'), value: 'INACTIVE' }
])
const statusFilter = ref<LoanProductStatus | ''>('')

const filteredByStatus = computed(() =>
  statusFilter.value
    ? (products.value ?? []).filter((p) => p.status === statusFilter.value)
    : products.value
)

const { search, page, pageSize, sort, total, rows } = useClientTable(filteredByStatus, {
  searchFields: ['name', 'code'],
  pageSize: 10
})

const hasFilters = computed(() => !!search.value || !!statusFilter.value)

const totalLabel = computed(() => {
  const count = products.value?.length ?? 0
  return count === 1
    ? t('loanConfig.loanProducts.total.one')
    : t('loanConfig.loanProducts.total.other', { count })
})

const fields = computed<FieldDef[]>(() => [
  {
    name: 'name',
    label: t('loanConfig.loanProducts.productNameLabel'),
    required: true,
    wrapper: 'half'
  },
  {
    name: 'code',
    label: t('loanConfig.loanProducts.productCodeLabel'),
    required: true,
    hint: t('loanConfig.loanProducts.productCodeHint'),
    wrapper: 'half'
  },
  {
    name: 'loanType',
    label: t('loanConfig.loanProducts.loanTypeLabel'),
    type: 'select',
    required: true,
    wrapper: 'half',
    options: [
      { label: t('loanConfig.loanProducts.optionPersonal'), value: 'PERSONAL' },
      { label: t('loanConfig.loanProducts.optionHome'), value: 'HOME' },
      { label: t('loanConfig.loanProducts.optionAuto'), value: 'AUTO' },
      { label: t('loanConfig.loanProducts.optionBusiness'), value: 'BUSINESS' },
      { label: t('loanConfig.loanProducts.optionEducation'), value: 'EDUCATION' },
      { label: t('loanConfig.loanProducts.optionOther'), value: 'OTHER' }
    ]
  },
  {
    name: 'currency',
    label: t('loanConfig.loanProducts.currencyLabel'),
    type: 'select',
    required: true,
    wrapper: 'half',
    options: [
      { label: 'USD', value: 'USD' },
      { label: 'KHR', value: 'KHR' }
    ]
  },
  {
    name: 'minAmount',
    label: t('loanConfig.loanProducts.minAmountLabel'),
    type: 'number',
    required: true,
    min: 0,
    step: 0.01,
    wrapper: 'half'
  },
  {
    name: 'maxAmount',
    label: t('loanConfig.loanProducts.maxAmountLabel'),
    type: 'number',
    required: true,
    min: 0,
    step: 0.01,
    wrapper: 'half'
  },
  {
    name: 'minTerm',
    label: t('loanConfig.loanProducts.minTermLabel'),
    type: 'number',
    required: true,
    min: 1,
    wrapper: 'half'
  },
  {
    name: 'maxTerm',
    label: t('loanConfig.loanProducts.maxTermLabel'),
    type: 'number',
    required: true,
    min: 1,
    wrapper: 'half'
  },
  {
    name: 'status',
    label: t('loanConfig.shared.statusColumn'),
    type: 'select',
    required: true,
    default: 'DRAFT',
    wrapper: 'half',
    options: [
      { label: t('loanConfig.loanProducts.statusDraft'), value: 'DRAFT' },
      { label: t('loanConfig.loanProducts.statusPublished'), value: 'PUBLISHED' },
      { label: t('common.inactive'), value: 'INACTIVE' }
    ]
  },
  {
    name: 'effectiveFrom',
    label: t('loanConfig.shared.effectiveFromLabel'),
    type: 'date',
    required: true,
    wrapper: 'half'
  },
  {
    name: 'effectiveTo',
    label: t('loanConfig.shared.effectiveToLabel'),
    type: 'date',
    hint: t('loanConfig.shared.effectiveToHint'),
    wrapper: 'half'
  },
  { name: 'description', label: t('loanConfig.shared.descriptionLabel'), type: 'textarea' }
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
} = useCrudModals<LoanProductResponse, LoanProductRequest>('/loan-products', refresh, {
  entityName: t('loanConfig.entities.loanProduct'),
  createDefaults: () => ({
    name: '',
    code: '',
    loanType: undefined,
    currency: 'USD',
    minAmount: undefined,
    maxAmount: undefined,
    minTerm: undefined,
    maxTerm: undefined,
    status: 'DRAFT',
    effectiveFrom: '',
    effectiveTo: '',
    description: ''
  }),
  toForm: (row) => ({
    name: row.name,
    code: row.code,
    loanType: row.loanType,
    currency: row.currency,
    minAmount: row.minAmount,
    maxAmount: row.maxAmount,
    minTerm: row.minTerm,
    maxTerm: row.maxTerm,
    status: row.status,
    effectiveFrom: row.effectiveFrom,
    effectiveTo: row.effectiveTo ?? '',
    description: row.description ?? ''
  }),
  toPayload: (values) => ({
    name: values.name,
    code: values.code,
    loanType: values.loanType,
    currency: values.currency,
    minAmount: values.minAmount,
    maxAmount: values.maxAmount,
    minTerm: values.minTerm,
    maxTerm: values.maxTerm,
    status: values.status,
    effectiveFrom: values.effectiveFrom,
    effectiveTo: values.effectiveTo || undefined,
    description: values.description || undefined
  })
})
</script>
