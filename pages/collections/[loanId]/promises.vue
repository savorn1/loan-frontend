<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <span class="font-semibold">{{ t('collections.promises.title') }}</span>
        <UButton size="xs" icon="i-heroicons-plus" @click="openCreate">{{ t('collections.promises.addPromise') }}</UButton>
      </div>
    </template>

    <DataTable :rows="promises ?? []" :columns="columns" :loading="pending">
      <template #status-data="{ row }">
        <StatusBadge :status="row.status" />
      </template>
      <template #actions-data="{ row }">
        <UButton
          v-if="row.status === 'PENDING'"
          size="2xs"
          variant="soft"
          icon="i-heroicons-check-circle"
          @click="openResolve(row)"
        >
          {{ t('collections.promises.actions.resolve') }}
        </UButton>
      </template>
      <template #empty-state>
        <EmptyState
          icon="i-heroicons-hand-raised"
          :title="t('collections.promises.empty.title')"
          :description="t('collections.promises.empty.description')"
        >
          <template #action>
            <UButton icon="i-heroicons-plus" @click="openCreate">{{ t('collections.promises.addPromise') }}</UButton>
          </template>
        </EmptyState>
      </template>
    </DataTable>

    <UModal v-model="showCreate">
      <UCard>
        <template #header>
          <span class="font-semibold">{{ t('collections.promises.createModal.title') }}</span>
        </template>
        <DynamicForm
          v-model="createForm"
          :fields="createFields"
          :loading="creating"
          :error="createError"
          :submit-label="t('collections.promises.createModal.submit')"
          cancelable
          @submit="onCreate"
          @cancel="showCreate = false"
        />
      </UCard>
    </UModal>

    <UModal v-model="showResolve">
      <UCard>
        <template #header>
          <span class="font-semibold">{{ t('collections.promises.resolveModal.title', { id: resolvingRow?.id }) }}</span>
        </template>
        <DynamicForm
          v-model="resolveForm"
          :fields="resolveFields"
          :loading="resolving"
          :error="resolveError"
          :submit-label="t('collections.promises.resolveModal.submit')"
          cancelable
          @submit="onResolve"
          @cancel="showResolve = false"
        />
      </UCard>
    </UModal>
  </UCard>
</template>

<script setup lang="ts">
import type {
  CollectionPromiseRequest,
  CollectionPromiseResponse,
  ResolveCollectionPromiseRequest
} from '~/features/collections/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

const route = useRoute()
const api = useApi()
const toast = useToast()
const { t } = useI18n()

const loanId = route.params.loanId as string

const {
  data: promises,
  pending,
  refresh
} = await useAsyncData(`collection-case-${loanId}-promises`, () =>
  api<CollectionPromiseResponse[]>(`/payments/collections/${loanId}/promises`)
)

const columns = computed<ColumnDef<CollectionPromiseResponse>[]>(() => [
  { key: 'promisedAmount', label: t('collections.promises.columns.promisedAmount'), type: 'currency' },
  { key: 'promisedDate', label: t('collections.promises.columns.promisedDate'), type: 'date' },
  { key: 'status', label: t('collections.promises.columns.status') },
  { key: 'amountPaid', label: t('collections.promises.columns.amountPaid'), type: 'currency' },
  { key: 'createdByName', label: t('collections.promises.columns.takenBy') },
  { key: 'createdAt', label: t('collections.promises.columns.created'), type: 'datetime' },
  { key: 'actions', label: '', class: 'text-right' }
])

// ── Create ────────────────────────────────────────────────────────────────
const showCreate = ref(false)
const creating = ref(false)
const createError = ref('')
const createForm = ref<Record<string, any>>({})

const createFields = computed<FieldDef[]>(() => [
  {
    name: 'promisedAmount',
    label: t('collections.promises.createModal.promisedAmount'),
    type: 'currency',
    required: true,
    wrapper: 'half'
  },
  {
    name: 'promisedDate',
    label: t('collections.promises.createModal.promisedDate'),
    type: 'date',
    required: true,
    wrapper: 'half'
  },
  { name: 'notes', label: t('collections.promises.createModal.notes'), type: 'textarea', rows: 2 }
])

function openCreate() {
  createForm.value = { promisedAmount: undefined, promisedDate: '', notes: '' }
  createError.value = ''
  showCreate.value = true
}

async function onCreate(values: Record<string, any>) {
  creating.value = true
  createError.value = ''
  try {
    const payload: CollectionPromiseRequest = {
      promisedAmount: values.promisedAmount,
      promisedDate: values.promisedDate,
      notes: values.notes || undefined
    }
    await api(`/payments/collections/${loanId}/promises`, { method: 'POST', body: payload })
    toast.add({ title: t('collections.promises.createModal.success'), color: 'green' })
    showCreate.value = false
    await refresh()
  } catch (err) {
    createError.value = apiErrorMessage(err)
  } finally {
    creating.value = false
  }
}

// ── Resolve ───────────────────────────────────────────────────────────────
const showResolve = ref(false)
const resolving = ref(false)
const resolveError = ref('')
const resolvingRow = ref<CollectionPromiseResponse | null>(null)
const resolveForm = ref<Record<string, any>>({})

const resolveFields = computed<FieldDef[]>(() => [
  {
    name: 'status',
    label: t('collections.promises.resolveModal.outcome'),
    type: 'select',
    required: true,
    options: [
      { label: t('collections.promises.outcomes.kept'), value: 'KEPT' },
      { label: t('collections.promises.outcomes.broken'), value: 'BROKEN' },
      { label: t('collections.promises.outcomes.partial'), value: 'PARTIAL' }
    ]
  },
  { name: 'amountPaid', label: t('collections.promises.resolveModal.amountPaid'), type: 'currency' }
])

function openResolve(row: CollectionPromiseResponse) {
  resolvingRow.value = row
  resolveForm.value = { status: undefined, amountPaid: row.promisedAmount }
  resolveError.value = ''
  showResolve.value = true
}

async function onResolve(values: Record<string, any>) {
  if (!resolvingRow.value) return
  resolving.value = true
  resolveError.value = ''
  try {
    const payload: ResolveCollectionPromiseRequest = {
      status: values.status,
      amountPaid: values.amountPaid || undefined
    }
    await api(`/payments/collections/${loanId}/promises/${resolvingRow.value.id}/resolve`, {
      method: 'PUT',
      body: payload
    })
    toast.add({ title: t('collections.promises.resolveModal.success'), color: 'green' })
    showResolve.value = false
    await refresh()
  } catch (err) {
    resolveError.value = apiErrorMessage(err)
  } finally {
    resolving.value = false
  }
}
</script>
