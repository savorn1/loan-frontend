<template>
  <div>
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">{{ t('loans.adjustments.title') }}</span>
          <UButton v-if="isAdmin" size="xs" icon="i-heroicons-plus" @click="openCreate">{{
            t('loans.adjustments.add')
          }}</UButton>
        </div>
      </template>

      <UAlert
        v-if="fetchError"
        color="red"
        variant="subtle"
        class="mb-4"
        :title="apiErrorMessage(fetchError)"
      />

      <DataTable :rows="adjustments ?? []" :columns="columns" :loading="pending" numbered>
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-adjustments-horizontal"
            :title="t('loans.adjustments.empty.title')"
            :description="t('loans.adjustments.empty.description')"
          >
            <template v-if="isAdmin" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">{{
                t('loans.adjustments.add')
              }}</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>
    </UCard>

    <UModal v-model="showCreate">
      <UCard>
        <template #header>
          <span class="font-semibold">{{ t('loans.adjustments.add') }}</span>
        </template>
        <DynamicForm
          v-model="createForm"
          :fields="fields"
          :loading="creating"
          :error="error"
          :submit-label="t('loans.adjustments.submit')"
          cancelable
          @submit="onCreate"
          @cancel="showCreate = false"
        />
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { LoanAdjustmentRequest, LoanAdjustmentResponse } from '~/features/loans/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

const route = useRoute()
const api = useApi()
const toast = useToast()
const { isAdmin } = storeToRefs(useAuth())
const { t } = useI18n()

const loanId = route.params.id as string

const {
  data: adjustments,
  pending,
  error: fetchError,
  refresh
} = await useAsyncData(`loan-${loanId}-adjustments`, () =>
  api<LoanAdjustmentResponse[]>(`/loans/${loanId}/adjustments`)
)

const columns = computed<ColumnDef<LoanAdjustmentResponse>[]>(() => [
  { key: 'createdAt', label: t('loans.adjustments.columns.date'), type: 'datetime' },
  {
    key: 'type',
    label: t('loans.adjustments.columns.type'),
    type: 'badge',
    color: (row) => (row.type === 'CREDIT' ? 'teal' : 'orange')
  },
  { key: 'reason', label: t('loans.adjustments.columns.reason') },
  { key: 'amount', label: t('loans.adjustments.columns.amount'), type: 'currency' }
])

const fields = computed<FieldDef[]>(() => [
  {
    name: 'type',
    label: t('loans.adjustments.fields.type'),
    type: 'select',
    required: true,
    options: [
      { label: t('loans.adjustments.typeOptions.credit'), value: 'CREDIT' },
      { label: t('loans.adjustments.typeOptions.debit'), value: 'DEBIT' }
    ]
  },
  { name: 'amount', label: t('loans.adjustments.fields.amount'), type: 'currency', required: true },
  { name: 'reason', label: t('loans.adjustments.fields.reason'), type: 'textarea', required: true }
])

const showCreate = ref(false)
const creating = ref(false)
const error = ref('')
const createForm = ref<Record<string, any>>({})

function openCreate() {
  createForm.value = { type: 'CREDIT', amount: undefined, reason: '' }
  error.value = ''
  showCreate.value = true
}

async function onCreate(values: Record<string, any>) {
  creating.value = true
  error.value = ''
  try {
    const payload: LoanAdjustmentRequest = {
      type: values.type,
      amount: values.amount,
      reason: values.reason
    }
    await api(`/loans/${loanId}/adjustments`, { method: 'POST', body: payload })
    toast.add({ title: t('loans.adjustments.toast.added'), color: 'green' })
    showCreate.value = false
    await refresh()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    creating.value = false
  }
}
</script>
