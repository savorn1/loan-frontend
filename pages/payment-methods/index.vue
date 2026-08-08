<template>
  <div>
    <PageHeader :title="t('payments.methods.title')" :description="totalLabel">
      <template #actions>
        <UButton icon="i-heroicons-plus" @click="openCreate">{{
          t('payments.methods.newPaymentMethod')
        }}</UButton>
      </template>
    </PageHeader>

    <UCard>
      <template #header>
        <UInput
          v-model="search"
          icon="i-heroicons-magnifying-glass"
          :placeholder="t('payments.methods.searchPlaceholder')"
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

      <DataTable
        v-model:sort="sort"
        :rows="rows"
        :columns="columns"
        :loading="pending"
        numbered
        :row-number-start="(page - 1) * pageSize"
      >
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
            :icon="search ? 'i-heroicons-magnifying-glass' : 'i-heroicons-wallet'"
            :title="search ? t('common.noMatches') : t('payments.methods.emptyTitle')"
            :description="
              search
                ? t('common.nothingMatches', { query: search })
                : t('payments.methods.emptyDescription')
            "
          >
            <template v-if="!search" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">{{
                t('payments.methods.newPaymentMethod')
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
          <span class="font-semibold">{{ t('payments.methods.newPaymentMethod') }}</span>
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
          <span class="font-semibold">{{ t('payments.methods.editPaymentMethod') }}</span>
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
        confirmDelete ? t('payments.methods.deleteConfirmTitle', { name: confirmDelete.name }) : ''
      "
      :description="t('payments.methods.deleteConfirmDescription')"
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
import type { PaymentMethodRequest, PaymentMethodResponse } from '~/features/payments/types'
import type { ColumnDef, FieldDef, PageResponse } from '~/shared/types'

const api = useApi()
const { t } = useI18n()

const page = ref(1)
const pageSize = ref(10)
const search = ref('')
const sort = ref<{ column: string; direction: 'asc' | 'desc' } | undefined>(undefined)

function buildQuery() {
  return {
    page: page.value,
    size: pageSize.value,
    search: search.value || undefined,
    sortBy: sort.value?.column ?? 'createdAt',
    sortOrder: sort.value?.direction ?? 'desc'
  }
}

const {
  data: methodsPage,
  pending,
  error: fetchError,
  refresh
} = await useAsyncData('payment-methods', () =>
  api<PageResponse<PaymentMethodResponse>>('/payments/methods', { query: buildQuery() })
)

const rows = computed(() => methodsPage.value?.content ?? [])
const total = computed(() => methodsPage.value?.totalElements ?? 0)

watch(page, () => refresh())
watch(pageSize, () => {
  page.value = 1
  refresh()
})
watch(
  sort,
  () => {
    page.value = 1
    refresh()
  },
  { deep: true }
)

// Debounced so we don't fire a request on every keystroke.
let searchTimer: ReturnType<typeof setTimeout>
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    refresh()
  }, 400)
})

const columns = computed<ColumnDef<PaymentMethodResponse>[]>(() => [
  { key: 'code', label: t('payments.methods.columns.code'), sortable: true },
  { key: 'name', label: t('payments.methods.columns.name'), sortable: true },
  { key: 'type', label: t('payments.methods.columns.type'), type: 'enum', sortable: true },
  { key: 'status', label: t('payments.methods.columns.status'), type: 'status', sortable: true },
  {
    key: 'createdAt',
    label: t('payments.methods.columns.created'),
    type: 'datetime',
    sortable: true
  },
  { key: 'actions', label: '', class: 'text-right' }
])

const totalLabel = computed(() => {
  const count = total.value
  return count === 1
    ? t('payments.methods.totalLabelOne')
    : t('payments.methods.totalLabelOther', { count })
})

const fields = computed<FieldDef[]>(() => [
  { name: 'code', label: t('payments.methods.fields.code'), required: true, wrapper: 'half' },
  { name: 'name', label: t('payments.methods.fields.name'), required: true, wrapper: 'half' },
  {
    name: 'type',
    label: t('payments.methods.fields.type'),
    type: 'select',
    required: true,
    wrapper: 'half',
    options: [
      { label: t('payments.methods.types.cash'), value: 'CASH' },
      { label: t('payments.methods.types.bankTransfer'), value: 'BANK_TRANSFER' },
      { label: t('payments.methods.types.creditCard'), value: 'CREDIT_CARD' },
      { label: t('payments.methods.types.mobileWallet'), value: 'MOBILE_WALLET' },
      { label: t('payments.methods.types.cheque'), value: 'CHEQUE' }
    ]
  },
  {
    name: 'status',
    label: t('payments.methods.fields.status'),
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
} = useCrudModals<PaymentMethodResponse, PaymentMethodRequest>('/payments/methods', refresh, {
  entityName: t('payments.entities.paymentMethod'),
  createDefaults: () => ({ code: '', name: '', type: undefined, status: 'ACTIVE' }),
  toForm: (row) => ({
    code: row.code,
    name: row.name,
    type: row.type,
    status: row.status
  }),
  toPayload: (values) => ({
    code: values.code,
    name: values.name,
    type: values.type,
    status: values.status
  })
})
</script>
