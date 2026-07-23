<template>
  <div v-if="product">
    <UButton to="/loan-products" variant="link" icon="i-heroicons-arrow-left" size="xs" class="mb-1 px-0">
      Back to loan products
    </UButton>
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <h1 class="text-xl font-bold">{{ product.productName }}</h1>
        <span class="text-sm text-gray-400 font-mono">{{ product.productCode }}</span>
        <StatusBadge :status="product.status" />
      </div>
      <UButton v-if="isAdmin" color="red" variant="soft" icon="i-heroicons-trash" @click="confirmDelete = true">
        Delete
      </UButton>
    </div>

    <UHorizontalNavigation :links="tabs" class="border-b border-gray-200 dark:border-gray-800 mb-6" />

    <NuxtPage />

    <ConfirmModal
      v-model="confirmDelete"
      title="Delete loan product?"
      :description="`This permanently removes ${product.productName} along with its rates, fees, terms, rules and document checklist. This cannot be undone.`"
      confirm-label="Delete"
      color="red"
      :loading="deleting"
      @confirm="onDelete"
    />
  </div>
  <div v-else class="flex justify-center py-16">
    <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-gray-400" />
  </div>
</template>

<script setup lang="ts">
// Tab shell shared by every /loan-products/:id/** page — renders the product
// header once (name, code, status, delete) and hosts the tab body via
// <NuxtPage/>, same pattern as pages/loans/[id].vue.
import type { LoanProductResponse } from '~/features/loan-products/types'

const route = useRoute()
const router = useRouter()
const api = useApi()
const toast = useToast()
const { isAdmin } = storeToRefs(useAuth())

const productId = route.params.id as string

const { data: product } = await useAsyncData(`loan-product-${productId}`, () =>
  api<LoanProductResponse>(`/loan-products/${productId}`)
)

const tabs = computed(() => [
  { label: 'Overview', to: `/loan-products/${productId}`, exact: true },
  { label: 'Interest rates', to: `/loan-products/${productId}/interest-rates` },
  { label: 'Fees', to: `/loan-products/${productId}/fees` },
  { label: 'Terms', to: `/loan-products/${productId}/terms` },
  { label: 'Eligibility rules', to: `/loan-products/${productId}/rules` },
  { label: 'Documents', to: `/loan-products/${productId}/documents` }
])

const deleting = ref(false)
const confirmDelete = ref(false)

async function onDelete() {
  deleting.value = true
  try {
    await api(`/loan-products/${productId}`, { method: 'DELETE' })
    toast.add({ title: 'Loan product deleted', color: 'green' })
    await router.push('/loan-products')
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
    confirmDelete.value = false
  } finally {
    deleting.value = false
  }
}
</script>
