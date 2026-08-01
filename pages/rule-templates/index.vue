<template>
  <div>
    <PageHeader :title="t('loanConfig.ruleTemplates.title')" :description="totalLabel">
      <template #actions>
        <UButton icon="i-heroicons-plus" @click="openCreate">{{
          t('loanConfig.ruleTemplates.newRuleTemplate')
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
            :icon="search ? 'i-heroicons-magnifying-glass' : 'i-heroicons-adjustments-horizontal'"
            :title="search ? t('common.noMatches') : t('loanConfig.ruleTemplates.emptyTitle')"
            :description="
              search
                ? t('common.nothingMatches', { query: search })
                : t('loanConfig.ruleTemplates.emptyDescription')
            "
          >
            <template v-if="!search" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">{{
                t('loanConfig.ruleTemplates.newRuleTemplate')
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
          <span class="font-semibold">{{ t('loanConfig.ruleTemplates.newRuleTemplate') }}</span>
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
          <span class="font-semibold">{{ t('loanConfig.ruleTemplates.editHeader') }}</span>
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
      :title="t('loanConfig.ruleTemplates.deleteTitle')"
      :description="t('loanConfig.ruleTemplates.deleteDescription')"
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
import type { RuleTemplateRequest, RuleTemplateResponse } from '~/features/loan-configuration/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

const { t } = useI18n()
const api = useApi()

const {
  data: templates,
  pending,
  refresh
} = await useAsyncData('rule-templates', () => api<RuleTemplateResponse[]>('/rule-templates'))

const columns = computed<ColumnDef<RuleTemplateResponse>[]>(() => [
  { key: 'code', label: t('loanConfig.shared.codeColumn'), sortable: true },
  { key: 'name', label: t('loanConfig.shared.nameColumn'), sortable: true },
  { key: 'field', label: t('loanConfig.shared.fieldColumn'), type: 'enum', sortable: true },
  { key: 'operator', label: t('loanConfig.shared.operatorColumn'), type: 'enum', sortable: true },
  { key: 'status', label: t('loanConfig.shared.statusColumn'), type: 'status', sortable: true },
  {
    key: 'createdAt',
    label: t('loanConfig.shared.createdColumn'),
    type: 'datetime',
    sortable: true
  },
  { key: 'actions', label: '', class: 'text-right' }
])

const { search, page, pageSize, sort, total, rows } = useClientTable(templates, {
  searchFields: ['name', 'code'],
  pageSize: 10
})

const totalLabel = computed(() => {
  const count = templates.value?.length ?? 0
  return count === 1
    ? t('loanConfig.ruleTemplates.total.one')
    : t('loanConfig.ruleTemplates.total.other', { count })
})

const fields = computed<FieldDef[]>(() => [
  { name: 'code', label: t('loanConfig.shared.codeColumn'), required: true, wrapper: 'half' },
  { name: 'name', label: t('loanConfig.shared.nameColumn'), required: true, wrapper: 'half' },
  {
    name: 'field',
    label: t('loanConfig.shared.fieldColumn'),
    type: 'select',
    required: true,
    wrapper: 'half',
    options: [
      { label: t('loanConfig.ruleTemplates.optionCreditScore'), value: 'CREDIT_SCORE' },
      { label: t('loanConfig.ruleTemplates.optionMonthlyIncome'), value: 'MONTHLY_INCOME' },
      { label: t('loanConfig.ruleTemplates.optionAge'), value: 'AGE' },
      { label: t('loanConfig.ruleTemplates.optionEmploymentStatus'), value: 'EMPLOYMENT_STATUS' },
      {
        label: t('loanConfig.ruleTemplates.optionExistingLoanCount'),
        value: 'EXISTING_LOAN_COUNT'
      },
      {
        label: t('loanConfig.ruleTemplates.optionDebtToIncomeRatio'),
        value: 'DEBT_TO_INCOME_RATIO'
      }
    ]
  },
  {
    name: 'operator',
    label: t('loanConfig.shared.operatorColumn'),
    type: 'select',
    required: true,
    wrapper: 'half',
    options: [
      { label: t('loanConfig.ruleTemplates.optionEquals'), value: 'EQUALS' },
      { label: t('loanConfig.ruleTemplates.optionNotEquals'), value: 'NOT_EQUALS' },
      { label: t('loanConfig.ruleTemplates.optionGreaterThan'), value: 'GREATER_THAN' },
      {
        label: t('loanConfig.ruleTemplates.optionGreaterThanOrEqual'),
        value: 'GREATER_THAN_OR_EQUAL'
      },
      { label: t('loanConfig.ruleTemplates.optionLessThan'), value: 'LESS_THAN' },
      {
        label: t('loanConfig.ruleTemplates.optionLessThanOrEqual'),
        value: 'LESS_THAN_OR_EQUAL'
      },
      { label: t('loanConfig.ruleTemplates.optionBetween'), value: 'BETWEEN' },
      { label: t('loanConfig.ruleTemplates.optionIn'), value: 'IN' }
    ]
  },
  {
    name: 'value',
    label: t('loanConfig.shared.valueColumn'),
    required: true,
    wrapper: 'half',
    hint: t('loanConfig.ruleTemplates.valueHint')
  },
  {
    name: 'value2',
    label: t('loanConfig.ruleTemplates.value2Label'),
    wrapper: 'half',
    hint: t('loanConfig.ruleTemplates.value2Hint')
  },
  { name: 'description', label: t('loanConfig.shared.descriptionLabel'), type: 'textarea' },
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
} = useCrudModals<RuleTemplateResponse, RuleTemplateRequest>('/rule-templates', refresh, {
  entityName: t('loanConfig.entities.ruleTemplate'),
  createDefaults: () => ({
    code: '',
    name: '',
    field: undefined,
    operator: undefined,
    value: '',
    value2: '',
    description: '',
    status: 'ACTIVE'
  }),
  toForm: (row) => ({
    code: row.code,
    name: row.name,
    field: row.field,
    operator: row.operator,
    value: row.value,
    value2: row.value2 ?? '',
    description: row.description ?? '',
    status: row.status
  }),
  toPayload: (values) => ({
    code: values.code,
    name: values.name,
    field: values.field,
    operator: values.operator,
    value: values.value,
    value2: values.value2 || undefined,
    description: values.description || undefined,
    status: values.status
  })
})
</script>
