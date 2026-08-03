<template>
  <DynamicForm
    v-model="form"
    :fields="fields"
    :loading="loading"
    :submit-label="submitLabel ?? t('common.save')"
    :cancelable="cancelable"
    @submit="onSubmit"
    @cancel="emit('cancel')"
  />
</template>

<script setup lang="ts">
import type { GroupRequest, GroupResponse } from '~/features/groups/types'
import type { BranchResponse } from '~/features/branches/types'
import type { CustomerResponse } from '~/features/customers/types'
import type { LoanProductResponse } from '~/features/loan-products/types'
import type { FieldDef, PageResponse } from '~/shared/types'

const props = defineProps<{
  initial?: Partial<GroupResponse>
  loading?: boolean
  submitLabel?: string
  cancelable?: boolean
}>()

const emit = defineEmits<{ submit: [GroupRequest]; cancel: [] }>()

const { t } = useI18n()
const api = useApi()

const { data: branchesData } = await useAsyncData('branches-all', () =>
  api<BranchResponse[]>('/branches')
)
const branchOptions = computed(() => [
  { label: t('groups.form.branchNone'), value: '' },
  ...(branchesData.value ?? []).map((b) => ({ label: b.name, value: b.id }))
])

const { data: loanProductsData } = await useAsyncData('loan-products-all', () =>
  api<LoanProductResponse[]>('/loan-products')
)
const loanProductOptions = computed(() => [
  { label: t('groups.form.loanProductNone'), value: '' },
  ...(loanProductsData.value ?? [])
    .filter((p) => p.status === 'PUBLISHED')
    .map((p) => ({ label: `${p.name} (${p.code})`, value: p.id }))
])

async function searchCustomers(query: string) {
  const result = await api<PageResponse<CustomerResponse>>('/customers', {
    query: { search: query, size: 20 }
  })
  return result.content.map((c) => ({ label: `${c.fullName} (#${c.id})`, value: c.id }))
}

const fields = computed<FieldDef[]>(() => [
  { name: 'name', label: t('groups.form.name'), required: true, wrapper: 'half' },
  { name: 'code', label: t('groups.form.code'), wrapper: 'half' },
  {
    name: 'loanProductId',
    label: t('groups.form.loanProduct'),
    type: 'select',
    wrapper: 'half',
    options: loanProductOptions.value
  },
  {
    name: 'branchId',
    label: t('groups.form.branch'),
    type: 'select',
    wrapper: 'half',
    options: branchOptions.value
  },
  {
    name: 'leaderCustomerId',
    label: t('groups.form.leader'),
    type: 'relationship',
    wrapper: 'half',
    search: searchCustomers,
    placeholder: t('groups.form.leaderPlaceholder')
  },
  {
    name: 'formationDate',
    label: t('groups.form.formationDate'),
    type: 'date',
    wrapper: 'half'
  }
])

const form = ref<Record<string, any>>({
  name: props.initial?.name ?? '',
  code: props.initial?.code ?? '',
  loanProductId: props.initial?.loanProductId ?? '',
  branchId: props.initial?.branchId ?? '',
  leaderCustomerId: props.initial?.leaderCustomerId ?? undefined,
  formationDate: props.initial?.formationDate ?? ''
})

function onSubmit(values: Record<string, any>) {
  emit('submit', {
    ...values,
    loanProductId: values.loanProductId || undefined,
    branchId: values.branchId || undefined,
    leaderCustomerId: values.leaderCustomerId || undefined,
    formationDate: values.formationDate || undefined,
    code: values.code || undefined
  } as GroupRequest)
}
</script>
