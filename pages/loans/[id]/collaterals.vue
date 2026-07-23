<template>
  <div>
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">Collateral</span>
          <UButton v-if="isAdmin" size="xs" icon="i-heroicons-plus" @click="openCreate"
            >Add collateral</UButton
          >
        </div>
      </template>

      <DataTable :rows="collaterals ?? []" :columns="columns" :loading="pending">
        <template #actions-data="{ row }">
          <UButton
            v-if="isAdmin && row.status === 'PLEDGED'"
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
            icon="i-heroicons-shield-check"
            title="No collateral pledged"
            description="Record assets pledged as security for this loan — property, vehicles, equipment or a cash deposit."
          >
            <template v-if="isAdmin" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">Add collateral</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div
        v-if="totalPledged"
        class="pt-4 mt-2 border-t border-gray-200 dark:border-gray-800 text-sm flex justify-between"
      >
        <span class="text-gray-500">Total pledged value</span>
        <span class="font-semibold">{{ formatCurrency(totalPledged) }}</span>
      </div>
    </UCard>

    <UModal v-model="showCreate">
      <UCard>
        <template #header>
          <span class="font-semibold">Add collateral</span>
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
import type { LoanCollateralRequest, LoanCollateralResponse } from '~/features/loans/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

const route = useRoute()
const api = useApi()
const toast = useToast()
const { isAdmin } = storeToRefs(useAuth())

const loanId = route.params.id as string

const {
  data: collaterals,
  pending,
  refresh
} = await useAsyncData(`loan-${loanId}-collaterals`, () =>
  api<LoanCollateralResponse[]>(`/loans/${loanId}/collaterals`)
)

const totalPledged = computed(() =>
  (collaterals.value ?? [])
    .filter((c) => c.status === 'PLEDGED')
    .reduce((sum, c) => sum + c.estimatedValue, 0)
)

const columns: ColumnDef<LoanCollateralResponse>[] = [
  { key: 'type', type: 'enum' },
  { key: 'description' },
  { key: 'estimatedValue', label: 'Value', type: 'currency' },
  { key: 'reference' },
  { key: 'status', type: 'status' },
  { key: 'createdAt', label: 'Created', type: 'datetime' },
  { key: 'actions', label: '' }
]

const fields: FieldDef[] = [
  {
    name: 'type',
    type: 'select',
    required: true,
    wrapper: 'half',
    options: [
      { label: 'Real estate', value: 'REAL_ESTATE' },
      { label: 'Vehicle', value: 'VEHICLE' },
      { label: 'Equipment', value: 'EQUIPMENT' },
      { label: 'Cash deposit', value: 'CASH_DEPOSIT' },
      { label: 'Other', value: 'OTHER' }
    ]
  },
  {
    name: 'estimatedValue',
    label: 'Estimated value',
    type: 'number',
    required: true,
    prefix: '$',
    min: 0.01,
    step: 0.01,
    wrapper: 'half'
  },
  { name: 'description', type: 'textarea', required: true },
  { name: 'reference' }
]

const showCreate = ref(false)
const creating = ref(false)
const releasing = ref<number | null>(null)
const error = ref('')
const createForm = ref<Record<string, any>>({})

function openCreate() {
  createForm.value = { type: undefined, estimatedValue: undefined, description: '', reference: '' }
  error.value = ''
  showCreate.value = true
}

async function onCreate(values: Record<string, any>) {
  creating.value = true
  error.value = ''
  try {
    const payload: LoanCollateralRequest = {
      type: values.type,
      description: values.description,
      estimatedValue: values.estimatedValue,
      reference: values.reference || undefined
    }
    await api(`/loans/${loanId}/collaterals`, { method: 'POST', body: payload })
    toast.add({ title: 'Collateral recorded', color: 'green' })
    showCreate.value = false
    await refresh()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    creating.value = false
  }
}

async function onRelease(collateralId: number) {
  releasing.value = collateralId
  try {
    await api(`/loans/${loanId}/collaterals/${collateralId}/release`, { method: 'PUT' })
    toast.add({ title: 'Collateral released', color: 'green' })
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    releasing.value = null
  }
}
</script>
