<template>
  <div>
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">{{ t('loans.restructures.title') }}</span>
          <UButton v-if="isAdmin" size="xs" icon="i-heroicons-plus" @click="openCreate"
            >{{ t('loans.restructures.add') }}</UButton
          >
        </div>
      </template>

      <UAlert
        v-if="fetchError"
        color="red"
        variant="subtle"
        class="mb-4"
        :title="apiErrorMessage(fetchError)"
      />

      <DataTable :rows="restructures ?? []" :columns="columns" :loading="pending">
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-arrow-path-rounded-square"
            :title="t('loans.restructures.empty.title')"
            :description="t('loans.restructures.empty.description')"
          >
            <template v-if="isAdmin" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">{{ t('loans.restructures.add') }}</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>
    </UCard>

    <UModal v-model="showCreate">
      <UCard>
        <template #header>
          <span class="font-semibold">{{ t('loans.restructures.add') }}</span>
        </template>
        <DynamicForm
          v-model="createForm"
          :fields="fields"
          :loading="creating"
          :error="error"
          :submit-label="t('loans.restructures.submit')"
          cancelable
          @submit="onCreate"
          @cancel="showCreate = false"
        />
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { LoanRestructureRequest, LoanRestructureResponse } from '~/features/loans/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

const route = useRoute()
const api = useApi()
const toast = useToast()
const { isAdmin } = storeToRefs(useAuth())
const { t } = useI18n()

const loanId = route.params.id as string

const {
  data: restructures,
  pending,
  error: fetchError,
  refresh
} = await useAsyncData(`loan-${loanId}-restructures`, () =>
  api<LoanRestructureResponse[]>(`/loans/${loanId}/restructures`)
)

const columns = computed<ColumnDef<LoanRestructureResponse>[]>(() => [
  { key: 'effectiveDate', label: t('loans.restructures.columns.effective'), type: 'date' },
  {
    key: 'newTermMonths',
    label: t('loans.restructures.columns.newTerm'),
    suffix: t('loans.restructures.columns.newTermSuffix')
  },
  { key: 'newInterestRate', label: t('loans.restructures.columns.newRate'), type: 'percent' },
  { key: 'reason', label: t('loans.restructures.columns.reason') },
  { key: 'createdAt', label: t('loans.restructures.columns.created'), type: 'datetime' }
])

const fields = computed<FieldDef[]>(() => [
  {
    name: 'newTermMonths',
    label: t('loans.restructures.fields.newTermMonths'),
    type: 'number',
    required: true,
    min: 1,
    wrapper: 'half'
  },
  {
    name: 'newInterestRate',
    label: t('loans.restructures.fields.newInterestRate'),
    type: 'number',
    suffix: '%',
    min: 0.01,
    max: 100,
    step: 0.01,
    hint: t('loans.restructures.fields.newInterestRateHint'),
    wrapper: 'half'
  },
  { name: 'effectiveDate', label: t('loans.restructures.fields.effectiveDate'), type: 'date', required: true },
  { name: 'reason', label: t('loans.restructures.fields.reason'), type: 'textarea', required: true }
])

const showCreate = ref(false)
const creating = ref(false)
const error = ref('')
const createForm = ref<Record<string, any>>({})

function openCreate() {
  createForm.value = {
    newTermMonths: undefined,
    newInterestRate: undefined,
    effectiveDate: '',
    reason: ''
  }
  error.value = ''
  showCreate.value = true
}

async function onCreate(values: Record<string, any>) {
  creating.value = true
  error.value = ''
  try {
    const payload: LoanRestructureRequest = {
      newTermMonths: values.newTermMonths,
      newInterestRate: values.newInterestRate || undefined,
      effectiveDate: values.effectiveDate,
      reason: values.reason
    }
    await api(`/loans/${loanId}/restructures`, { method: 'POST', body: payload })
    toast.add({ title: t('loans.restructures.toast.recorded'), color: 'green' })
    showCreate.value = false
    await refresh()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    creating.value = false
  }
}
</script>
