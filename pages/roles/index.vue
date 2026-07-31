<template>
  <div>
    <PageHeader :title="t('admin.roles.title')" :description="totalLabel">
      <template #actions>
        <UButton icon="i-heroicons-plus" @click="openCreate">{{ t('admin.roles.newRole') }}</UButton>
      </template>
    </PageHeader>

    <UCard>
      <template #header>
        <UInput
          v-model="search"
          icon="i-heroicons-magnifying-glass"
          :placeholder="t('admin.roles.searchPlaceholder')"
          class="max-w-xs"
        >
          <template v-if="search" #trailing>
            <UButton
              color="gray"
              variant="link"
              icon="i-heroicons-x-mark"
              :padded="false"
              @click="search = ''"
            />
          </template>
        </UInput>
      </template>

      <DataTable :rows="rows" :columns="columns" :loading="pending" @select="onSelect">
        <template #permissionCount-data="{ row }">
          <UBadge color="gray" variant="subtle">{{ row.permissionCount }}</UBadge>
        </template>
        <template #userCount-data="{ row }">
          <UBadge color="gray" variant="subtle">{{ row.userCount }}</UBadge>
        </template>
        <template #actions-data="{ row }">
          <div class="flex gap-1 justify-end">
            <UButton
              size="2xs"
              variant="soft"
              icon="i-heroicons-pencil"
              @click.stop="openEdit(row)"
            />
            <UButton
              size="2xs"
              color="red"
              variant="soft"
              icon="i-heroicons-trash"
              @click.stop="confirmDelete = row"
            />
          </div>
        </template>
        <template #empty-state>
          <EmptyState
            :icon="search ? 'i-heroicons-magnifying-glass' : 'i-heroicons-shield-check'"
            :title="search ? t('admin.roles.empty.matchesTitle') : t('admin.roles.empty.emptyTitle')"
            :description="
              search
                ? t('admin.roles.empty.matchesDescription', { query: search })
                : t('admin.roles.empty.emptyDescription')
            "
          >
            <template v-if="!search" #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">{{ t('admin.roles.newRole') }}</UButton>
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
          <span class="font-semibold">{{ t('admin.roles.createModalTitle') }}</span>
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
          <span class="font-semibold">{{ t('admin.roles.editModalTitle') }}</span>
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

    <ConfirmModal
      :model-value="confirmDelete !== null"
      :title="t('admin.roles.deleteConfirmTitle')"
      :description="
        confirmDelete
          ? t('admin.roles.deleteConfirmDescription', { userCount: confirmDelete.userCount, permissionCount: confirmDelete.permissionCount })
          : ''
      "
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
import type { RoleRequest, RoleResponse } from '~/features/roles/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

definePageMeta({ middleware: 'admin' })

const { t } = useI18n()
const api = useApi()
const router = useRouter()

const {
  data: roles,
  pending,
  refresh
} = await useAsyncData('roles', () => api<RoleResponse[]>('/auth/roles'))

const search = ref('')
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  const list = roles.value ?? []
  if (!q) return list
  return list.filter(
    (r) => r.name.toLowerCase().includes(q) || (r.description ?? '').toLowerCase().includes(q)
  )
})

const { page, pageSize, total, rows } = useClientTable(filtered, { pageSize: 10 })

const totalLabel = computed(() => {
  const count = roles.value?.length ?? 0
  return count === 1 ? t('admin.roles.total.one') : t('admin.roles.total.other', { count })
})

const columns = computed<ColumnDef<RoleResponse>[]>(() => [
  { key: 'name', label: t('admin.roles.columns.name'), sortable: true },
  { key: 'description', label: t('admin.roles.columns.description') },
  { key: 'permissionCount', label: t('admin.roles.columns.permissions') },
  { key: 'userCount', label: t('admin.roles.columns.users') },
  { key: 'createdAt', label: t('admin.roles.columns.created'), type: 'datetime' },
  { key: 'actions', label: '', class: 'text-right' }
])

function onSelect(row: RoleResponse) {
  router.push(`/roles/${row.id}`)
}

const fields = computed<FieldDef[]>(() => [
  { name: 'name', label: t('admin.roles.fields.name'), hint: t('admin.roles.fields.nameHint'), required: true },
  { name: 'description', label: t('admin.roles.fields.description'), type: 'textarea', rows: 2 }
])

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
} = useCrudModals<RoleResponse, RoleRequest>('/auth/roles', refresh, {
  entityName: t('admin.entities.role'),
  createDefaults: () => ({ name: '', description: '' }),
  toForm: (row) => ({ name: row.name, description: row.description ?? '' }),
  toPayload: (values) => ({ name: values.name, description: values.description || undefined })
})
</script>
