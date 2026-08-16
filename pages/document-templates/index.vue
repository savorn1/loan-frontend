<template>
  <div>
    <PageHeader :title="t('loanConfig.documentTemplates.title')" :description="totalLabel">
      <template #actions>
        <UButton icon="i-heroicons-plus" @click="openCreate">{{
          t('loanConfig.documentTemplates.newDocumentTemplate')
        }}</UButton>
      </template>
    </PageHeader>

    <UCard>
      <template #header>
        <UInput
          v-model="search"
          icon="i-heroicons-magnifying-glass"
          :placeholder="t('loanConfig.shared.searchByNameOrCode')"
          class="max-w-xs"
        >
          <template v-if="search" #trailing>
            <UButton
              color="gray"
              variant="link"
              icon="i-heroicons-x-mark"
              :aria-label="t('common.clearSearch')"
              :padded="false"
              @click="search = ''"
            />
          </template>
        </UInput>
      </template>

      <UAlert
        v-if="fetchError"
        color="red"
        variant="subtle"
        class="mb-4"
        :title="apiErrorMessage(fetchError)"
      />

      <DataTable
        v-model:sort="sort"
        :rows="rows"
        :columns="columns"
        :loading="pending"
        refreshable
        @refresh="refresh"
      >
        <template #actions-data="{ row }">
          <div class="flex gap-1 justify-end">
            <UButton
              size="2xs"
              variant="soft"
              :color="row.sampleFileUrl ? 'primary' : 'gray'"
              icon="i-heroicons-paper-clip"
              :aria-label="t('loanConfig.documentTemplates.sampleFile')"
              @click="openSampleFile(row)"
            />
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
          </div>
        </template>
        <template #empty-state>
          <EmptyState
            :icon="search ? 'i-heroicons-magnifying-glass' : 'i-heroicons-document-duplicate'"
            :title="search ? t('common.noMatches') : t('loanConfig.documentTemplates.emptyTitle')"
            :description="
              search
                ? t('common.nothingMatches', { query: search })
                : t('loanConfig.documentTemplates.emptyDescription')
            "
          >
            <template v-if="!search" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">{{
                t('loanConfig.documentTemplates.newDocumentTemplate')
              }}</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>

    <UModal v-model="showCreate">
      <UCard>
        <template #header>
          <span class="font-semibold">{{
            t('loanConfig.documentTemplates.newDocumentTemplate')
          }}</span>
        </template>
        <DynamicForm
          v-model="createForm"
          :fields="fields"
          :loading="creating"
          :error="error"
          :submit-label="t('common.create')"
          cancelable
          @submit="onCreate"
          @cancel="showCreate = false"
        />
      </UCard>
    </UModal>

    <UModal v-model="showEdit">
      <UCard>
        <template #header>
          <span class="font-semibold">{{ t('loanConfig.documentTemplates.editHeader') }}</span>
        </template>
        <DynamicForm
          v-model="editForm"
          :fields="fields"
          :loading="editing"
          :error="editError"
          :submit-label="t('common.saveChanges')"
          cancelable
          @submit="onEdit"
          @cancel="showEdit = false"
        />
      </UCard>
    </UModal>

    <UModal
      :model-value="sampleFileTarget !== null"
      @update:model-value="
        (v: boolean) => {
          if (!v) sampleFileTarget = null
        }
      "
    >
      <UCard v-if="sampleFileTarget">
        <template #header>
          <span class="font-semibold">{{ t('loanConfig.documentTemplates.sampleFile') }}</span>
        </template>

        <div
          v-if="sampleFileTarget.sampleFileUrl"
          class="flex items-center justify-between gap-2 mb-4"
        >
          <a
            :href="sampleFileTarget.sampleFileUrl"
            target="_blank"
            rel="noopener"
            class="text-sm font-medium truncate text-primary-500 hover:underline"
          >
            {{ sampleFileTarget.sampleFileName }}
          </a>
          <UButton
            size="2xs"
            color="red"
            variant="soft"
            icon="i-heroicons-trash"
            :loading="removingSampleFile"
            @click="onRemoveSampleFile"
          >
            {{ t('common.remove') }}
          </UButton>
        </div>
        <EmptyState
          v-else
          icon="i-heroicons-paper-clip"
          :title="t('loanConfig.documentTemplates.noSampleFileTitle')"
          :description="t('loanConfig.documentTemplates.noSampleFileDescription')"
        />

        <FileUpload
          v-model="sampleFileToUpload"
          :max-size-mb="10"
          :disabled="uploadingSampleFile"
          class="mt-4"
        />
        <div class="flex justify-end gap-2 pt-4">
          <UButton color="gray" variant="ghost" @click="sampleFileTarget = null">{{
            t('common.close')
          }}</UButton>
          <UButton
            :loading="uploadingSampleFile"
            :disabled="!sampleFileToUpload"
            @click="onUploadSampleFile"
          >
            {{ t('loanConfig.documentTemplates.uploadSampleFile') }}
          </UButton>
        </div>
      </UCard>
    </UModal>

    <ConfirmModal
      :model-value="confirmDelete !== null"
      :title="
        confirmDelete
          ? t('loanConfig.documentTemplates.deleteTitle', { name: confirmDelete.name })
          : ''
      "
      :description="t('loanConfig.documentTemplates.deleteDescription')"
      :confirm-label="t('common.delete')"
      color="red"
      :loading="deleting"
      @update:model-value="
        (v: boolean) => {
          if (!v) confirmDelete = null
        }
      "
      @confirm="onDelete"
    />
  </div>
</template>

<script setup lang="ts">
import type {
  DocumentTemplateRequest,
  DocumentTemplateResponse
} from '~/features/loan-configuration/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

const { t } = useI18n()
const api = useApi()
const toast = useToast()

const {
  data: templates,
  pending,
  error: fetchError,
  refresh
} = await useAsyncData('document-templates', () =>
  api<DocumentTemplateResponse[]>('/document-templates')
)

const columns = computed<ColumnDef<DocumentTemplateResponse>[]>(() => [
  { key: 'code', label: t('loanConfig.shared.codeColumn'), sortable: true },
  { key: 'name', label: t('loanConfig.shared.nameColumn'), sortable: true },
  { key: 'status', label: t('loanConfig.shared.statusColumn'), type: 'status', sortable: true },
  {
    key: 'createdAt',
    label: t('loanConfig.shared.createdColumn'),
    type: 'datetime',
    sortable: true
  },
  { key: 'actions', label: '', class: 'text-right' }
])

const { search, page, pageSize, sort, total, rows } = useClientTable(templates, {
  searchFields: ['name', 'code'],
  pageSize: 10
})

const totalLabel = computed(() => {
  const count = templates.value?.length ?? 0
  return count === 1
    ? t('loanConfig.documentTemplates.total.one')
    : t('loanConfig.documentTemplates.total.other', { count })
})

const fields = computed<FieldDef[]>(() => [
  { name: 'code', label: t('loanConfig.shared.codeColumn'), required: true, wrapper: 'half' },
  { name: 'name', label: t('loanConfig.shared.nameColumn'), required: true, wrapper: 'half' },
  { name: 'description', label: t('loanConfig.shared.descriptionLabel'), type: 'textarea' },
  {
    name: 'status',
    label: t('loanConfig.shared.statusColumn'),
    type: 'select',
    required: true,
    default: 'ACTIVE',
    wrapper: 'half',
    options: [
      { label: t('common.active'), value: 'ACTIVE' },
      { label: t('common.inactive'), value: 'INACTIVE' }
    ]
  }
])

// ── Sample file ──────────────────────────────────────────────────────────────
const sampleFileTarget = ref<DocumentTemplateResponse | null>(null)
const sampleFileToUpload = ref<File | null>(null)
const uploadingSampleFile = ref(false)
const removingSampleFile = ref(false)

function openSampleFile(row: DocumentTemplateResponse) {
  sampleFileTarget.value = row
  sampleFileToUpload.value = null
}

async function onUploadSampleFile() {
  if (!sampleFileTarget.value || !sampleFileToUpload.value) return
  uploadingSampleFile.value = true
  try {
    const formData = new FormData()
    formData.append('file', sampleFileToUpload.value)
    const updated = await api<DocumentTemplateResponse>(
      `/document-templates/${sampleFileTarget.value.id}/sample-file`,
      { method: 'POST', body: formData }
    )
    sampleFileTarget.value = updated
    sampleFileToUpload.value = null
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    uploadingSampleFile.value = false
  }
}

async function onRemoveSampleFile() {
  if (!sampleFileTarget.value) return
  removingSampleFile.value = true
  try {
    const updated = await api<DocumentTemplateResponse>(
      `/document-templates/${sampleFileTarget.value.id}/sample-file`,
      { method: 'DELETE' }
    )
    sampleFileTarget.value = updated
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    removingSampleFile.value = false
  }
}

const {
  showCreate,
  creating,
  error,
  createForm,
  openCreate,
  onCreate,
  showEdit,
  editing,
  editError,
  editForm,
  openEdit,
  onEdit,
  deleting,
  confirmDelete,
  onDelete
} = useCrudModals<DocumentTemplateResponse, DocumentTemplateRequest>(
  '/document-templates',
  refresh,
  {
    entityName: t('loanConfig.entities.documentTemplate'),
    createDefaults: () => ({ code: '', name: '', description: '', status: 'ACTIVE' }),
    toForm: (row) => ({
      code: row.code,
      name: row.name,
      description: row.description ?? '',
      status: row.status
    }),
    toPayload: (values) => ({
      code: values.code,
      name: values.name,
      description: values.description || undefined,
      status: values.status
    })
  }
)
</script>
