<template>
  <div>
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">{{ t('loans.refinances.title') }}</span>
          <UButton v-if="isAdmin" size="xs" icon="i-heroicons-plus" @click="openCreate">{{
            t('loans.refinances.add')
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

      <DataTable :rows="refinances ?? []" :columns="columns" :loading="pending" numbered>
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-arrows-right-left"
            :title="t('loans.refinances.empty.title')"
            :description="t('loans.refinances.empty.description')"
          >
            <template v-if="isAdmin" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">{{
                t('loans.refinances.add')
              }}</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>
    </UCard>

    <UModal v-model="showCreate">
      <UCard>
        <template #header>
          <span class="font-semibold">{{ t('loans.refinances.add') }}</span>
        </template>
        <DynamicForm
          v-model="createForm"
          :fields="fields"
          :loading="creating"
          :error="error"
          :submit-label="t('loans.refinances.submit')"
          cancelable
          @submit="onCreate"
          @cancel="showCreate = false"
        />
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type {
  LoanRefinanceRequest,
  LoanRefinanceResponse,
  LoanResponse
} from '~/features/loans/types'
import type { ColumnDef, FieldDef, PageResponse } from '~/shared/types'

const route = useRoute()
const api = useApi()
const toast = useToast()
const { isAdmin } = storeToRefs(useAuth())
const { t } = useI18n()

const loanId = route.params.id as string

const {
  data: refinances,
  pending,
  error: fetchError,
  refresh
} = await useAsyncData(`loan-${loanId}-refinances`, () =>
  api<LoanRefinanceResponse[]>(`/loans/${loanId}/refinances`)
)
const { data: allLoans } = await useAsyncData(`loan-${loanId}-refinances-loans`, () =>
  api<PageResponse<LoanResponse>>('/loans', { query: { size: 1000 } })
)

const loanOptions = computed(() =>
  (allLoans.value?.content ?? [])
    .filter((l) => String(l.id) !== loanId)
    .map((l) => ({ label: `#${l.id} — ${l.customerName} (${l.status})`, value: l.id }))
)

const columns = computed<ColumnDef<LoanRefinanceResponse>[]>(() => [
  { key: 'effectiveDate', label: t('loans.refinances.columns.effective'), type: 'date' },
  {
    key: 'newLoanId',
    label: t('loans.refinances.columns.newLoanId'),
    type: 'link',
    href: (row) => `/loans/${row.newLoanId}`,
    prefix: () => '#'
  },
  { key: 'reason', label: t('loans.refinances.columns.reason') },
  { key: 'createdAt', label: t('loans.refinances.columns.created'), type: 'datetime' }
])

const fields = computed<FieldDef[]>(() => [
  {
    name: 'newLoanId',
    label: t('loans.refinances.fields.newLoanId'),
    type: 'select',
    required: true,
    options: loanOptions.value,
    placeholder: t('loans.refinances.fields.newLoanIdPlaceholder')
  },
  {
    name: 'effectiveDate',
    label: t('loans.refinances.fields.effectiveDate'),
    type: 'date',
    required: true
  },
  { name: 'reason', label: t('loans.refinances.fields.reason'), type: 'textarea', required: true }
])

const showCreate = ref(false)
const creating = ref(false)
const error = ref('')
const createForm = ref<Record<string, any>>({})

function openCreate() {
  createForm.value = { newLoanId: undefined, effectiveDate: '', reason: '' }
  error.value = ''
  showCreate.value = true
}

async function onCreate(values: Record<string, any>) {
  creating.value = true
  error.value = ''
  try {
    const payload: LoanRefinanceRequest = {
      newLoanId: values.newLoanId,
      effectiveDate: values.effectiveDate,
      reason: values.reason
    }
    await api(`/loans/${loanId}/refinances`, { method: 'POST', body: payload })
    toast.add({ title: t('loans.refinances.toast.recorded'), color: 'green' })
    showCreate.value = false
    await refresh()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    creating.value = false
  }
}
</script>
