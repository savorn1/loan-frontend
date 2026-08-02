<template>
  <div>
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">{{ t('loans.guarantors.title') }}</span>
          <UButton v-if="isAdmin" size="xs" icon="i-heroicons-plus" @click="openCreate"
            >{{ t('loans.guarantors.add') }}</UButton
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

      <DataTable :rows="guarantors ?? []" :columns="columns" :loading="pending">
        <template #actions-data="{ row }">
          <UButton
            v-if="isAdmin && row.status === 'ACTIVE'"
            size="2xs"
            variant="soft"
            :loading="releasing === row.id"
            @click="onRelease(row.id)"
          >
            {{ t('loans.guarantors.release') }}
          </UButton>
        </template>
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-user-group"
            :title="t('loans.guarantors.empty.title')"
            :description="t('loans.guarantors.empty.description')"
          >
            <template v-if="isAdmin" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">{{ t('loans.guarantors.add') }}</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>
    </UCard>

    <UModal v-model="showCreate">
      <UCard>
        <template #header>
          <span class="font-semibold">{{ t('loans.guarantors.add') }}</span>
        </template>
        <DynamicForm
          v-model="createForm"
          :fields="fields"
          :loading="creating"
          :error="error"
          :submit-label="t('loans.guarantors.submit')"
          cancelable
          @submit="onCreate"
          @cancel="showCreate = false"
        />
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { LoanGuarantorRequest, LoanGuarantorResponse } from '~/features/loans/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

const route = useRoute()
const api = useApi()
const toast = useToast()
const { isAdmin } = storeToRefs(useAuth())
const { t } = useI18n()

const loanId = route.params.id as string

const {
  data: guarantors,
  pending,
  error: fetchError,
  refresh
} = await useAsyncData(`loan-${loanId}-guarantors`, () =>
  api<LoanGuarantorResponse[]>(`/loans/${loanId}/guarantors`)
)

const columns = computed<ColumnDef<LoanGuarantorResponse>[]>(() => [
  { key: 'name', label: t('loans.guarantors.columns.name') },
  { key: 'phone', label: t('loans.guarantors.columns.phone') },
  { key: 'relationship', label: t('loans.guarantors.columns.relationship') },
  { key: 'guaranteedAmount', label: t('loans.guarantors.columns.guaranteedAmount'), type: 'currency' },
  { key: 'status', label: t('loans.guarantors.columns.status'), type: 'status' },
  { key: 'createdAt', label: t('loans.guarantors.columns.created'), type: 'datetime' },
  { key: 'actions', label: t('loans.guarantors.columns.actions') }
])

const fields = computed<FieldDef[]>(() => [
  { name: 'name', label: t('loans.guarantors.fields.name'), required: true, wrapper: 'half' },
  {
    name: 'phone',
    label: t('loans.guarantors.fields.phone'),
    type: 'phone',
    required: true,
    wrapper: 'half'
  },
  { name: 'relationship', label: t('loans.guarantors.fields.relationship'), wrapper: 'half' },
  {
    name: 'guaranteedAmount',
    label: t('loans.guarantors.fields.guaranteedAmount'),
    type: 'currency',
    hint: t('loans.guarantors.fields.guaranteedAmountHint'),
    wrapper: 'half'
  }
])

const showCreate = ref(false)
const creating = ref(false)
const releasing = ref<number | null>(null)
const error = ref('')
const createForm = ref<Record<string, any>>({})

function openCreate() {
  createForm.value = { name: '', phone: '', relationship: '', guaranteedAmount: undefined }
  error.value = ''
  showCreate.value = true
}

async function onCreate(values: Record<string, any>) {
  creating.value = true
  error.value = ''
  try {
    const payload: LoanGuarantorRequest = {
      name: values.name,
      phone: values.phone,
      relationship: values.relationship || undefined,
      guaranteedAmount: values.guaranteedAmount || undefined
    }
    await api(`/loans/${loanId}/guarantors`, { method: 'POST', body: payload })
    toast.add({ title: t('loans.guarantors.toast.added'), color: 'green' })
    showCreate.value = false
    await refresh()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    creating.value = false
  }
}

async function onRelease(guarantorId: number) {
  releasing.value = guarantorId
  try {
    await api(`/loans/${loanId}/guarantors/${guarantorId}/release`, { method: 'PUT' })
    toast.add({ title: t('loans.guarantors.toast.released'), color: 'green' })
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    releasing.value = null
  }
}
</script>
