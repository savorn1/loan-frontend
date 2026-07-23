<template>
  <div>
    <PageHeader title="Fees" :description="totalLabel">
      <template #actions>
        <USelectMenu
          v-model="jumpToProduct"
          :options="productOptions"
          option-attribute="label"
          searchable
          placeholder="Manage fees for a product..."
          class="max-w-xs w-full sm:w-auto"
        />
      </template>
    </PageHeader>

    <UCard class="mb-6">
      <div class="flex flex-wrap items-center gap-3">
        <UInput
          v-model="search"
          icon="i-heroicons-magnifying-glass"
          placeholder="Search by name, product name or code..."
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
        <template #actions-data="{ row }">
          <UButton size="2xs" color="red" variant="soft" icon="i-heroicons-trash" @click="confirmDelete = row" />
        </template>
        <template #empty-state>
          <EmptyState
            :icon="search ? 'i-heroicons-magnifying-glass' : 'i-heroicons-banknotes'"
            :title="search ? 'No matches' : 'No fees yet'"
            :description="search ? `Nothing matches “${search}”.` : 'Open a loan product and add a fee under its Fees tab.'"
          />
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>

    <ConfirmModal
      :model-value="confirmDelete !== null"
      title="Delete this fee?"
      description="This removes the fee from its product. This action cannot be undone."
      confirm-label="Delete"
      color="red"
      :loading="deleting"
      @update:model-value="(v: boolean) => { if (!v) confirmDelete = null }"
      @confirm="onDelete"
    />
  </div>
</template>

<script setup lang="ts">
import type { LoanProductFeeResponse, LoanProductResponse } from '~/features/loan-products/types'
import type { ColumnDef } from '~/shared/types'

const api = useApi()
const toast = useToast()
const router = useRouter()

const { data: fees, pending, refresh } = await useAsyncData('loan-product-fees-all', () =>
  api<LoanProductFeeResponse[]>('/loan-products/fees')
)
const { data: products } = await useAsyncData('loan-product-fees-products', () => api<LoanProductResponse[]>('/loan-products'))

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
  if (v) router.push(`/loan-products/${v.value}/fees`)
})

const columns: ColumnDef<LoanProductFeeResponse>[] = [
  { key: 'product', type: 'link', value: row => productLabel(row.loanProductId), href: row => `/loan-products/${row.loanProductId}/fees` },
  { key: 'name', sortable: true },
  { key: 'type', type: 'enum' },
  { key: 'amount', value: row => (row.calculationMethod === 'PERCENTAGE' ? `${row.amount}%` : formatCurrency(row.amount)) },
  { key: 'chargeTiming', label: 'Charged', type: 'enum' },
  { key: 'createdAt', label: 'Created', type: 'datetime' },
  { key: 'actions', label: '', class: 'text-right' }
]

const { search, page, pageSize, sort, total, rows } = useClientTable(
  computed(() => (fees.value ?? []).map(f => ({ ...f, productSearch: productLabel(f.loanProductId) }))),
  { searchFields: ['name', 'productSearch'], pageSize: 15 }
)

const totalLabel = computed(() => {
  const count = fees.value?.length ?? 0
  return count === 1 ? '1 fee' : `${count} fees`
})

const deleting = ref(false)
const confirmDelete = ref<LoanProductFeeResponse | null>(null)

async function onDelete() {
  if (!confirmDelete.value) return
  deleting.value = true
  try {
    await api(`/loan-products/${confirmDelete.value.loanProductId}/fees/${confirmDelete.value.id}`, { method: 'DELETE' })
    toast.add({ title: 'Fee deleted', color: 'green' })
    confirmDelete.value = null
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    deleting.value = false
  }
}
</script>
