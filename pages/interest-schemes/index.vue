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
  </div>
</template>

<script setup lang="ts">
import type {
  InterestSchemeRequest,
  InterestSchemeResponse
} from '~/features/loan-configuration/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

const { t } = useI18n()
const api = useApi()

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
</script>
