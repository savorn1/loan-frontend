<template>
  <div>
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">Eligibility rules</span>
          <UButton v-if="isAdmin" size="xs" icon="i-heroicons-plus" @click="openCreate">Add rule</UButton>
        </div>
      </template>

      <DataTable :rows="rules ?? []" :columns="columns" :loading="pending">
        <template #condition-data="{ row }">
          <span class="font-mono text-xs">{{ operatorSymbol(row.operator) }} {{ row.value }}<template v-if="row.operator === 'BETWEEN'"> and {{ row.value2 }}</template></span>
        </template>
        <template #actions-data="{ row }">
          <div class="flex gap-1 justify-end">
            <UButton v-if="isAdmin" size="2xs" variant="soft" icon="i-heroicons-pencil" @click="openEdit(row)" />
            <UButton v-if="isAdmin" size="2xs" color="red" variant="soft" icon="i-heroicons-trash" @click="confirmDeleteId = row.id" />
          </div>
        </template>
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-shield-check"
            title="No eligibility rules"
            description="Add conditions an applicant must meet to qualify for this loan product."
          >
            <template v-if="isAdmin" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">Add rule</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>
    </UCard>

    <UModal v-model="showForm">
      <UCard>
        <template #header>
          <span class="font-semibold">{{ editingId ? 'Edit eligibility rule' : 'Add eligibility rule' }}</span>
        </template>

        <UForm :state="form" class="space-y-4" @submit="onSubmit">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UFormGroup label="Field" name="field" required>
              <USelectMenu v-model="form.field" :options="fieldOptions" option-attribute="label" value-attribute="value" />
            </UFormGroup>
            <UFormGroup label="Operator" name="operator" required>
              <USelectMenu v-model="form.operator" :options="operatorOptions" option-attribute="label" value-attribute="value" />
            </UFormGroup>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UFormGroup :label="valueLabel" name="value" required>
              <UInput v-model="form.value" :placeholder="form.operator === 'IN' ? 'e.g. EMPLOYED,SELF_EMPLOYED' : ''" />
            </UFormGroup>
            <UFormGroup v-if="form.operator === 'BETWEEN'" label="Upper bound" name="value2" required>
              <UInput v-model="form.value2" />
            </UFormGroup>
          </div>

          <UFormGroup label="Description" name="description">
            <UInput v-model="form.description" placeholder="e.g. Minimum credit score requirement" />
          </UFormGroup>

          <UAlert v-if="error" color="red" variant="subtle" :title="error" />

          <div class="flex justify-end gap-2 pt-2">
            <UButton color="gray" variant="ghost" @click="showForm = false">Cancel</UButton>
            <UButton type="submit" :loading="saving">{{ editingId ? 'Save changes' : 'Add' }}</UButton>
          </div>
        </UForm>
      </UCard>
    </UModal>

    <ConfirmModal
      :model-value="confirmDeleteId !== null"
      title="Delete this rule?"
      description="This removes the eligibility condition from the product. This action cannot be undone."
      confirm-label="Delete"
      color="red"
      :loading="deleting"
      @update:model-value="(v: boolean) => { if (!v) confirmDeleteId = null }"
      @confirm="onDelete"
    />
  </div>
</template>

<script setup lang="ts">
import type { LoanProductRuleRequest, LoanProductRuleResponse, RuleField, RuleOperator } from '~/features/loan-products/types'
import type { ColumnDef } from '~/shared/types'

const route = useRoute()
const api = useApi()
const toast = useToast()
const { isAdmin } = storeToRefs(useAuth())

const productId = route.params.id as string

const { data: rules, pending, refresh } = await useAsyncData(
  `loan-product-${productId}-rules`,
  () => api<LoanProductRuleResponse[]>(`/loan-products/${productId}/rules`)
)

const columns: ColumnDef<LoanProductRuleResponse>[] = [
  { key: 'field', type: 'enum' },
  { key: 'condition' },
  { key: 'description' },
  { key: 'createdAt', label: 'Created', type: 'datetime' },
  { key: 'actions', label: '', class: 'text-right' }
]

const fieldOptions: { label: string; value: RuleField }[] = [
  { label: 'Credit score', value: 'CREDIT_SCORE' },
  { label: 'Monthly income', value: 'MONTHLY_INCOME' },
  { label: 'Age', value: 'AGE' },
  { label: 'Employment status', value: 'EMPLOYMENT_STATUS' },
  { label: 'Existing loan count', value: 'EXISTING_LOAN_COUNT' },
  { label: 'Debt-to-income ratio', value: 'DEBT_TO_INCOME_RATIO' }
]

const operatorOptions: { label: string; value: RuleOperator }[] = [
  { label: 'Equals', value: 'EQUALS' },
  { label: 'Not equals', value: 'NOT_EQUALS' },
  { label: 'Greater than', value: 'GREATER_THAN' },
  { label: 'Greater than or equal', value: 'GREATER_THAN_OR_EQUAL' },
  { label: 'Less than', value: 'LESS_THAN' },
  { label: 'Less than or equal', value: 'LESS_THAN_OR_EQUAL' },
  { label: 'Between', value: 'BETWEEN' },
  { label: 'In (comma-separated list)', value: 'IN' }
]

const OPERATOR_SYMBOLS: Record<RuleOperator, string> = {
  EQUALS: '=',
  NOT_EQUALS: '≠',
  GREATER_THAN: '>',
  GREATER_THAN_OR_EQUAL: '≥',
  LESS_THAN: '<',
  LESS_THAN_OR_EQUAL: '≤',
  BETWEEN: 'between',
  IN: 'in'
}

function operatorSymbol(operator: RuleOperator) {
  return OPERATOR_SYMBOLS[operator]
}

const valueLabel = computed(() => (form.operator === 'BETWEEN' ? 'Lower bound' : 'Value'))

const showForm = ref(false)
const saving = ref(false)
const error = ref('')
const deleting = ref(false)
const confirmDeleteId = ref<number | null>(null)
const editingId = ref<number | null>(null)

const form = reactive<{ field: RuleField; operator: RuleOperator; value: string; value2: string; description: string }>({
  field: 'CREDIT_SCORE',
  operator: 'GREATER_THAN_OR_EQUAL',
  value: '',
  value2: '',
  description: ''
})

function openCreate() {
  editingId.value = null
  form.field = 'CREDIT_SCORE'
  form.operator = 'GREATER_THAN_OR_EQUAL'
  form.value = ''
  form.value2 = ''
  form.description = ''
  error.value = ''
  showForm.value = true
}

function openEdit(row: LoanProductRuleResponse) {
  editingId.value = row.id
  form.field = row.field
  form.operator = row.operator
  form.value = row.value
  form.value2 = row.value2 ?? ''
  form.description = row.description ?? ''
  error.value = ''
  showForm.value = true
}

async function onSubmit() {
  if (!form.value || (form.operator === 'BETWEEN' && !form.value2)) {
    error.value = 'Please fill in the required value(s).'
    return
  }
  saving.value = true
  error.value = ''
  try {
    const payload: LoanProductRuleRequest = {
      field: form.field,
      operator: form.operator,
      value: form.value,
      value2: form.operator === 'BETWEEN' ? form.value2 : undefined,
      description: form.description || undefined
    }
    if (editingId.value) {
      await api(`/loan-products/${productId}/rules/${editingId.value}`, { method: 'PUT', body: payload })
      toast.add({ title: 'Rule updated', color: 'green' })
    } else {
      await api(`/loan-products/${productId}/rules`, { method: 'POST', body: payload })
      toast.add({ title: 'Rule added', color: 'green' })
    }
    showForm.value = false
    await refresh()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    saving.value = false
  }
}

async function onDelete() {
  if (confirmDeleteId.value === null) return
  deleting.value = true
  try {
    await api(`/loan-products/${productId}/rules/${confirmDeleteId.value}`, { method: 'DELETE' })
    toast.add({ title: 'Rule deleted', color: 'green' })
    confirmDeleteId.value = null
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    deleting.value = false
  }
}
</script>
