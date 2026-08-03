<template>
  <div>
    <PageHeader :title="t('payments.channels.title')" :description="totalLabel">
      <template #actions>
        <UButton icon="i-heroicons-plus" @click="openCreate">{{
          t('payments.channels.newPaymentChannel')
        }}</UButton>
      </template>
    </PageHeader>

    <UCard>
      <template #header>
        <UInput
          v-model="search"
          icon="i-heroicons-magnifying-glass"
          :placeholder="t('payments.channels.searchPlaceholder')"
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
            :icon="search ? 'i-heroicons-magnifying-glass' : 'i-heroicons-signal'"
            :title="search ? t('common.noMatches') : t('payments.channels.emptyTitle')"
            :description="
              search
                ? t('common.nothingMatches', { query: search })
                : t('payments.channels.emptyDescription')
            "
          >
            <template v-if="!search" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">{{
                t('payments.channels.newPaymentChannel')
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
          <span class="font-semibold">{{ t('payments.channels.newPaymentChannel') }}</span>
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
          <span class="font-semibold">{{ t('payments.channels.editPaymentChannel') }}</span>
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
      :title="t('payments.channels.deleteConfirmTitle')"
      :description="t('payments.channels.deleteConfirmDescription')"
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
import type { PaymentChannelRequest, PaymentChannelResponse } from '~/features/payments/types'
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
  data: channelsPage,
  pending,
  error: fetchError,
  refresh
} = await useAsyncData('payment-channels', () =>
  api<PageResponse<PaymentChannelResponse>>('/payments/channels', { query: buildQuery() })
)

const rows = computed(() => channelsPage.value?.content ?? [])
const total = computed(() => channelsPage.value?.totalElements ?? 0)

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

const columns = computed<ColumnDef<PaymentChannelResponse>[]>(() => [
  { key: 'code', label: t('payments.channels.columns.code'), sortable: true },
  { key: 'name', label: t('payments.channels.columns.name'), sortable: true },
  {
    key: 'channelType',
    label: t('payments.channels.columns.channelType'),
    sortable: true
  },
  { key: 'status', label: t('payments.channels.columns.status'), type: 'status', sortable: true },
  {
    key: 'createdAt',
    label: t('payments.channels.columns.created'),
    type: 'datetime',
    sortable: true
  },
  { key: 'actions', label: '', class: 'text-right' }
])

const totalLabel = computed(() => {
  const count = total.value
  return count === 1
    ? t('payments.channels.totalLabelOne')
    : t('payments.channels.totalLabelOther', { count })
})

const fields = computed<FieldDef[]>(() => [
  { name: 'code', label: t('payments.channels.fields.code'), required: true, wrapper: 'half' },
  { name: 'name', label: t('payments.channels.fields.name'), required: true, wrapper: 'half' },
  {
    name: 'channelType',
    label: t('payments.channels.fields.channelType'),
    required: true,
    wrapper: 'half'
  },
  {
    name: 'status',
    label: t('payments.channels.fields.status'),
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
} = useCrudModals<PaymentChannelResponse, PaymentChannelRequest>('/payments/channels', refresh, {
  entityName: t('payments.entities.paymentChannel'),
  createDefaults: () => ({ code: '', name: '', channelType: '', status: 'ACTIVE' }),
  toForm: (row) => ({
    code: row.code,
    name: row.name,
    channelType: row.channelType,
    status: row.status
  }),
  toPayload: (values) => ({
    code: values.code,
    name: values.name,
    channelType: values.channelType,
    status: values.status
  })
})
</script>
