<template>
  <div>
    <PageHeader title="Eligibility Rules" :description="totalLabel">
      <template #actions>
        <USelectMenu
          v-model="jumpToProduct"
          :options="productOptions"
          option-attribute="label"
          searchable
          placeholder="Manage rules for a product..."
          class="max-w-xs w-full sm:w-auto"
        />
      </template>
    </PageHeader>

    <UCard class="mb-6">
      <div class="flex flex-wrap items-center gap-3">
        <UInput
          v-model="search"
          icon="i-heroicons-magnifying-glass"
          placeholder="Search by product name or code..."
          class="max-w-xs w-full sm:w-auto"
        >
          <template v-if="search" #trailing>
            <UButton color="gray" variant="link" icon="i-heroicons-x-mark" :padded="false" @click="search = ''" />
          </template>
        </UInput>
      </div>
    </UCard>

    <UCard>
      <DataTable :rows="rows" :columns="columns" :loading="pending" v-model:sort="sort">
        <template #condition-data="{ row }">
          <span class="font-mono text-xs">{{ operatorSymbol(row.operator) }} {{ row.value }}<template v-if="row.operator === 'BETWEEN'"> and {{ row.value2 }}</template></span>
        </template>
        <template #actions-data="{ row }">
          <UButton size="2xs" color="red" variant="soft" icon="i-heroicons-trash" @click="confirmDelete = row" />
        </template>
        <template #empty-state>
          <EmptyState
            :icon="search ? 'i-heroicons-magnifying-glass' : 'i-heroicons-shield-check'"
            :title="search ? 'No matches' : 'No rules yet'"
            :description="search ? `Nothing matches “${search}”.` : 'Open a loan product and add a rule under its Eligibility rules tab.'"
          />
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>

    <ConfirmModal
      :model-value="confirmDelete !== null"
      title="Delete this rule?"
      description="This removes the eligibility condition from its product. This action cannot be undone."
      confirm-label="Delete"
      color="red"
      :loading="deleting"
      @update:model-value="(v: boolean) => { if (!v) confirmDelete = null }"
      @confirm="onDelete"
    />
  </div>
</template>

<script setup lang="ts">
import type { LoanProductResponse, LoanProductRuleResponse, RuleOperator } from '~/features/loan-products/types'
import type { ColumnDef } from '~/shared/types'

const api = useApi()
const toast = useToast()
const router = useRouter()

const { data: rules, pending, refresh } = await useAsyncData('loan-product-rules-all', () =>
  api<LoanProductRuleResponse[]>('/loan-products/rules')
)
const { data: products } = await useAsyncData('loan-product-rules-products', () => api<LoanProductResponse[]>('/loan-products'))

const productMap = computed(() => new Map((products.value ?? []).map(p => [p.id, p])))
function productLabel(id: string) {
  const p = productMap.value.get(id)
  return p ? `${p.productName} (${p.productCode})` : id
}

const productOptions = computed(() =>
  (products.value ?? []).map(p => ({ label: `${p.productName} (${p.productCode})`, value: p.id }))
)
const jumpToProduct = ref<{ label: string; value: string } | undefined>(undefined)
watch(jumpToProduct, (v) => {
  if (v) router.push(`/loan-products/${v.value}/rules`)
})

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

const columns: ColumnDef<LoanProductRuleResponse>[] = [
  { key: 'product', type: 'link', value: row => productLabel(row.loanProductId), href: row => `/loan-products/${row.loanProductId}/rules` },
  { key: 'field', type: 'enum' },
  { key: 'condition' },
  { key: 'description' },
  { key: 'createdAt', label: 'Created', type: 'datetime' },
  { key: 'actions', label: '', class: 'text-right' }
]

const { search, page, pageSize, sort, total, rows } = useClientTable(
  computed(() => (rules.value ?? []).map(r => ({ ...r, productSearch: productLabel(r.loanProductId) }))),
  { searchFields: ['productSearch'], pageSize: 15 }
)

const totalLabel = computed(() => {
  const count = rules.value?.length ?? 0
  return count === 1 ? '1 rule' : `${count} rules`
})

const deleting = ref(false)
const confirmDelete = ref<LoanProductRuleResponse | null>(null)

async function onDelete() {
  if (!confirmDelete.value) return
  deleting.value = true
  try {
    await api(`/loan-products/${confirmDelete.value.loanProductId}/rules/${confirmDelete.value.id}`, { method: 'DELETE' })
    toast.add({ title: 'Rule deleted', color: 'green' })
    confirmDelete.value = null
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    deleting.value = false
  }
}
</script>
