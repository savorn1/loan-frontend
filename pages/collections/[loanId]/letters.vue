<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <span class="font-semibold">{{ t('collections.letters.title') }}</span>
        <UButton size="xs" icon="i-heroicons-plus" @click="openCreate">{{ t('collections.letters.addLetter') }}</UButton>
      </div>
    </template>

    <UAlert
      v-if="fetchError"
      color="red"
      variant="subtle"
      class="mb-4"
      :title="apiErrorMessage(fetchError)"
    />

    <DataTable :rows="letters ?? []" :columns="columns" :loading="pending">
      <template #letterType-data="{ row }">
        <UBadge color="gray" variant="subtle">{{ formatEnum(row.letterType) }}</UBadge>
      </template>
      <template #status-data="{ row }">
        <StatusBadge :status="row.status" />
      </template>
      <template #actions-data="{ row }">
        <div class="flex gap-1 justify-end">
          <UButton
            v-if="row.status === 'DRAFT'"
            size="2xs"
            variant="soft"
            :loading="updatingId === row.id"
            @click="onUpdateStatus(row, 'SENT')"
          >
            {{ t('collections.letters.actions.markSent') }}
          </UButton>
          <template v-if="row.status === 'SENT'">
            <UButton
              size="2xs"
              variant="soft"
              color="teal"
              :loading="updatingId === row.id"
              @click="onUpdateStatus(row, 'DELIVERED')"
            >
              {{ t('collections.letters.actions.markDelivered') }}
            </UButton>
            <UButton
              size="2xs"
              variant="soft"
              color="red"
              :loading="updatingId === row.id"
              @click="onUpdateStatus(row, 'FAILED')"
            >
              {{ t('collections.letters.actions.markFailed') }}
            </UButton>
          </template>
        </div>
      </template>
      <template #empty-state>
        <EmptyState
          icon="i-heroicons-envelope"
          :title="t('collections.letters.empty.title')"
          :description="t('collections.letters.empty.description')"
        >
          <template #action>
            <UButton icon="i-heroicons-plus" @click="openCreate">{{ t('collections.letters.addLetter') }}</UButton>
          </template>
        </EmptyState>
      </template>
    </DataTable>

    <UModal v-model="showCreate">
      <UCard>
        <template #header>
          <span class="font-semibold">{{ t('collections.letters.createModal.title') }}</span>
        </template>
        <DynamicForm
          v-model="createForm"
          :fields="createFields"
          :loading="creating"
          :error="createError"
          :submit-label="t('collections.letters.createModal.submit')"
          cancelable
          @submit="onCreate"
          @cancel="showCreate = false"
        />
      </UCard>
    </UModal>
  </UCard>
</template>

<script setup lang="ts">
import type {
  CollectionLetterRequest,
  CollectionLetterResponse,
  LetterStatus,
  UpdateCollectionLetterStatusRequest
} from '~/features/collections/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

const route = useRoute()
const api = useApi()
const toast = useToast()
const { t } = useI18n()

const loanId = route.params.loanId as string

const {
  data: letters,
  pending,
  error: fetchError,
  refresh
} = await useAsyncData(`collection-case-${loanId}-letters`, () =>
  api<CollectionLetterResponse[]>(`/payments/collections/${loanId}/letters`)
)

const columns = computed<ColumnDef<CollectionLetterResponse>[]>(() => [
  { key: 'letterType', label: t('collections.letters.columns.type') },
  { key: 'deliveryMethod', label: t('collections.letters.columns.delivery'), type: 'enum' },
  { key: 'recipientAddress', label: t('collections.letters.columns.recipient') },
  { key: 'status', label: t('collections.letters.columns.status') },
  { key: 'generatedByName', label: t('collections.letters.columns.generatedBy') },
  { key: 'sentAt', label: t('collections.letters.columns.sent'), type: 'datetime' },
  { key: 'createdAt', label: t('collections.letters.columns.created'), type: 'datetime' },
  { key: 'actions', label: '', class: 'text-right' }
])

const showCreate = ref(false)
const creating = ref(false)
const createError = ref('')
const createForm = ref<Record<string, any>>({})

const createFields = computed<FieldDef[]>(() => [
  {
    name: 'letterType',
    label: t('collections.letters.createModal.type'),
    type: 'select',
    required: true,
    wrapper: 'half',
    options: [
      { label: t('collections.letters.types.reminder'), value: 'REMINDER' },
      { label: t('collections.letters.types.demand'), value: 'DEMAND' },
      { label: t('collections.letters.types.finalNotice'), value: 'FINAL_NOTICE' },
      { label: t('collections.letters.types.legalNotice'), value: 'LEGAL_NOTICE' }
    ]
  },
  {
    name: 'deliveryMethod',
    label: t('collections.letters.createModal.deliveryMethod'),
    type: 'select',
    required: true,
    wrapper: 'half',
    options: [
      { label: t('collections.letters.deliveryMethods.email'), value: 'EMAIL' },
      { label: t('collections.letters.deliveryMethods.post'), value: 'POST' },
      { label: t('collections.letters.deliveryMethods.sms'), value: 'SMS' }
    ]
  },
  { name: 'recipientAddress', label: t('collections.letters.createModal.recipientAddress') },
  {
    name: 'content',
    label: t('collections.letters.createModal.content'),
    type: 'textarea',
    rows: 4,
    hint: t('collections.letters.createModal.contentHint')
  }
])

function openCreate() {
  createForm.value = { letterType: undefined, deliveryMethod: undefined, recipientAddress: '', content: '' }
  createError.value = ''
  showCreate.value = true
}

async function onCreate(values: Record<string, any>) {
  creating.value = true
  createError.value = ''
  try {
    const payload: CollectionLetterRequest = {
      letterType: values.letterType,
      deliveryMethod: values.deliveryMethod,
      recipientAddress: values.recipientAddress || undefined,
      content: values.content || undefined
    }
    await api(`/payments/collections/${loanId}/letters`, { method: 'POST', body: payload })
    toast.add({ title: t('collections.letters.createModal.success'), color: 'green' })
    showCreate.value = false
    await refresh()
  } catch (err) {
    createError.value = apiErrorMessage(err)
  } finally {
    creating.value = false
  }
}

const updatingId = ref<number | null>(null)

async function onUpdateStatus(row: CollectionLetterResponse, status: Exclude<LetterStatus, 'DRAFT'>) {
  updatingId.value = row.id
  try {
    const payload: UpdateCollectionLetterStatusRequest = { status }
    await api(`/payments/collections/${loanId}/letters/${row.id}/status`, { method: 'PUT', body: payload })
    toast.add({ title: t('collections.letters.statusUpdated'), color: 'green' })
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    updatingId.value = null
  }
}
</script>
