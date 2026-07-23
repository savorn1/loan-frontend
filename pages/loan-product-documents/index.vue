<template>
  <div>
    <PageHeader title="Required Documents" :description="totalLabel">
      <template #actions>
        <USelectMenu
          v-model="jumpToProduct"
          :options="productOptions"
          option-attribute="label"
          searchable
          placeholder="Manage documents for a product..."
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
            :icon="search ? 'i-heroicons-magnifying-glass' : 'i-heroicons-document-check'"
            :title="search ? 'No matches' : 'No documents yet'"
            :description="search ? `Nothing matches “${search}”.` : 'Open a loan product and add a document under its Documents tab.'"
          />
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>

    <ConfirmModal
      :model-value="confirmDelete !== null"
      title="Delete this document?"
      description="This removes it from its product's document checklist. This action cannot be undone."
      confirm-label="Delete"
      color="red"
      :loading="deleting"
      @update:model-value="(v: boolean) => { if (!v) confirmDelete = null }"
      @confirm="onDelete"
    />
  </div>
</template>

<script setup lang="ts">
import type { LoanProductDocumentResponse, LoanProductResponse } from '~/features/loan-products/types'
import type { ColumnDef } from '~/shared/types'

const api = useApi()
const toast = useToast()
const router = useRouter()

const { data: documents, pending, refresh } = await useAsyncData('loan-product-documents-all', () =>
  api<LoanProductDocumentResponse[]>('/loan-products/documents')
)
const { data: products } = await useAsyncData('loan-product-documents-products', () => api<LoanProductResponse[]>('/loan-products'))

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
  if (v) router.push(`/loan-products/${v.value}/documents`)
})

const columns: ColumnDef<LoanProductDocumentResponse>[] = [
  { key: 'product', type: 'link', value: row => productLabel(row.loanProductId), href: row => `/loan-products/${row.loanProductId}/documents` },
  { key: 'name', sortable: true },
  { key: 'description' },
  { key: 'required', label: 'Status', type: 'boolean', trueLabel: 'Required', falseLabel: 'Optional', trueColor: 'orange', falseColor: 'gray' },
  { key: 'createdAt', label: 'Created', type: 'datetime' },
  { key: 'actions', label: '', class: 'text-right' }
]

const { search, page, pageSize, sort, total, rows } = useClientTable(
  computed(() => (documents.value ?? []).map(d => ({ ...d, productSearch: productLabel(d.loanProductId) }))),
  { searchFields: ['name', 'productSearch'], pageSize: 15 }
)

const totalLabel = computed(() => {
  const count = documents.value?.length ?? 0
  return count === 1 ? '1 document' : `${count} documents`
})

const deleting = ref(false)
const confirmDelete = ref<LoanProductDocumentResponse | null>(null)

async function onDelete() {
  if (!confirmDelete.value) return
  deleting.value = true
  try {
    await api(`/loan-products/${confirmDelete.value.loanProductId}/documents/${confirmDelete.value.id}`, { method: 'DELETE' })
    toast.add({ title: 'Document deleted', color: 'green' })
    confirmDelete.value = null
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    deleting.value = false
  }
}
</script>
