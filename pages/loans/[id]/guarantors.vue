<template>
  <div>
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">Guarantors</span>
          <UButton v-if="isAdmin" size="xs" icon="i-heroicons-plus" @click="openCreate"
            >Add guarantor</UButton
          >
        </div>
      </template>

      <DataTable :rows="guarantors ?? []" :columns="columns" :loading="pending">
        <template #actions-data="{ row }">
          <UButton
            v-if="isAdmin && row.status === 'ACTIVE'"
            size="2xs"
            variant="soft"
            :loading="releasing === row.id"
            @click="onRelease(row.id)"
          >
            Release
          </UButton>
        </template>
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-user-group"
            title="No guarantors"
            description="Add a third party backing repayment of this loan."
          >
            <template v-if="isAdmin" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">Add guarantor</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>
    </UCard>

    <UModal v-model="showCreate">
      <UCard>
        <template #header>
          <span class="font-semibold">Add guarantor</span>
        </template>
        <DynamicForm
          v-model="createForm"
          :fields="fields"
          :loading="creating"
          :error="error"
          submit-label="Add"
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

const loanId = route.params.id as string

const {
  data: guarantors,
  pending,
  refresh
} = await useAsyncData(`loan-${loanId}-guarantors`, () =>
  api<LoanGuarantorResponse[]>(`/loans/${loanId}/guarantors`)
)

const columns: ColumnDef<LoanGuarantorResponse>[] = [
  { key: 'name' },
  { key: 'phone' },
  { key: 'relationship' },
  { key: 'guaranteedAmount', label: 'Guaranteed amount', type: 'currency' },
  { key: 'status', type: 'status' },
  { key: 'createdAt', label: 'Created', type: 'datetime' },
  { key: 'actions', label: '' }
]

const fields: FieldDef[] = [
  { name: 'name', required: true, wrapper: 'half' },
  { name: 'phone', required: true, wrapper: 'half' },
  { name: 'relationship', wrapper: 'half' },
  {
    name: 'guaranteedAmount',
    label: 'Guaranteed amount',
    type: 'number',
    prefix: '$',
    min: 0.01,
    step: 0.01,
    hint: 'Optional — leave blank if unspecified',
    wrapper: 'half'
  }
]

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
    toast.add({ title: 'Guarantor added', color: 'green' })
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
    toast.add({ title: 'Guarantor released', color: 'green' })
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    releasing.value = null
  }
}
</script>
