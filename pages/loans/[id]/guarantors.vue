<template>
  <div>
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">{{ t('loans.guarantors.title') }}</span>
          <UButton v-if="isAdmin" size="xs" icon="i-heroicons-plus" @click="openCreate">{{
            t('loans.guarantors.add')
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

      <DataTable :rows="guarantors ?? []" :columns="columns" :loading="pending" numbered>
        <template #actions-data="{ row }">
          <div v-if="isAdmin && row.status === 'ACTIVE'" class="flex gap-1 justify-end">
            <UButton
              size="2xs"
              variant="soft"
              icon="i-heroicons-pencil"
              :aria-label="t('common.edit')"
              @click="openEdit(row)"
            />
            <UButton
              size="2xs"
              color="red"
              variant="soft"
              icon="i-heroicons-trash"
              :aria-label="t('common.delete')"
              @click="confirmDelete = row"
            />
            <UButton
              size="2xs"
              variant="soft"
              :loading="releasing === row.id"
              @click="onRelease(row.id)"
            >
              {{ t('loans.guarantors.release') }}
            </UButton>
          </div>
        </template>
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-user-group"
            :title="t('loans.guarantors.empty.title')"
            :description="t('loans.guarantors.empty.description')"
          >
            <template v-if="isAdmin" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">{{
                t('loans.guarantors.add')
              }}</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>
    </UCard>

    <UModal v-model="showForm">
      <UCard>
        <template #header>
          <span class="font-semibold">{{
            formMode === 'create' ? t('loans.guarantors.add') : t('loans.guarantors.editTitle')
          }}</span>
        </template>
        <DynamicForm
          v-model="guarantorForm"
          :fields="fields"
          :loading="submitting"
          :error="error"
          :submit-label="formMode === 'create' ? t('loans.guarantors.submit') : t('common.save')"
          cancelable
          @submit="onSubmitForm"
          @cancel="showForm = false"
        />
      </UCard>
    </UModal>

    <ConfirmModal
      :model-value="!!confirmDelete"
      :title="t('loans.guarantors.confirmDelete.title')"
      :description="t('loans.guarantors.confirmDelete.description')"
      :confirm-label="t('common.delete')"
      color="red"
      :loading="deleting"
      @update:model-value="
        (v: boolean) => {
          if (!v) confirmDelete = null
        }
      "
      @confirm="onConfirmDelete"
    />
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
  {
    key: 'guaranteedAmount',
    label: t('loans.guarantors.columns.guaranteedAmount'),
    type: 'currency'
  },
  { key: 'status', label: t('loans.guarantors.columns.status'), type: 'status' },
  { key: 'createdAt', label: t('loans.guarantors.columns.created'), type: 'datetime' },
  { key: 'actions', label: t('loans.guarantors.columns.actions'), class: 'text-right' }
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

const showForm = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const editingId = ref<number | null>(null)
const submitting = ref(false)
const releasing = ref<number | null>(null)
const error = ref('')
const guarantorForm = ref<Record<string, any>>({})

function openCreate() {
  formMode.value = 'create'
  editingId.value = null
  guarantorForm.value = { name: '', phone: '', relationship: '', guaranteedAmount: undefined }
  error.value = ''
  showForm.value = true
}

function openEdit(row: LoanGuarantorResponse) {
  formMode.value = 'edit'
  editingId.value = row.id
  guarantorForm.value = {
    name: row.name,
    phone: row.phone,
    relationship: row.relationship ?? '',
    guaranteedAmount: row.guaranteedAmount ?? undefined
  }
  error.value = ''
  showForm.value = true
}

async function onSubmitForm(values: Record<string, any>) {
  submitting.value = true
  error.value = ''
  try {
    const payload: LoanGuarantorRequest = {
      name: values.name,
      phone: values.phone,
      relationship: values.relationship || undefined,
      guaranteedAmount: values.guaranteedAmount || undefined
    }
    if (formMode.value === 'create') {
      await api(`/loans/${loanId}/guarantors`, { method: 'POST', body: payload })
      toast.add({ title: t('loans.guarantors.toast.added'), color: 'green' })
    } else {
      await api(`/loans/${loanId}/guarantors/${editingId.value}`, { method: 'PUT', body: payload })
      toast.add({ title: t('loans.guarantors.toast.updated'), color: 'green' })
    }
    showForm.value = false
    await refresh()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    submitting.value = false
  }
}

const confirmDelete = ref<LoanGuarantorResponse | null>(null)
const deleting = ref(false)

async function onConfirmDelete() {
  if (!confirmDelete.value) return
  deleting.value = true
  try {
    await api(`/loans/${loanId}/guarantors/${confirmDelete.value.id}`, { method: 'DELETE' })
    toast.add({ title: t('loans.guarantors.toast.deleted'), color: 'green' })
    confirmDelete.value = null
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    deleting.value = false
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
