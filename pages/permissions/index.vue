<template>
  <div>
    <PageHeader :title="t('admin.permissions.title')" :description="totalLabel">
      <template #actions>
        <UButton icon="i-heroicons-plus" @click="openCreate">{{ t('admin.permissions.newPermission') }}</UButton>
      </template>
    </PageHeader>

    <UCard class="mb-4">
      <UInput
        v-model="search"
        icon="i-heroicons-magnifying-glass"
        :placeholder="t('admin.permissions.searchPlaceholder')"
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
    </UCard>

    <EmptyState
      v-if="!pending && groups.length === 0"
      :icon="search ? 'i-heroicons-magnifying-glass' : 'i-heroicons-key'"
      :title="search ? t('admin.permissions.empty.matchesTitle') : t('admin.permissions.empty.emptyTitle')"
      :description="
        search
          ? t('admin.permissions.empty.matchesDescription', { query: search })
          : t('admin.permissions.empty.emptyDescription')
      "
    >
      <template v-if="!search" #action>
        <UButton icon="i-heroicons-plus" @click="openCreate">{{ t('admin.permissions.newPermission') }}</UButton>
      </template>
    </EmptyState>

    <UCard v-for="group in groups" :key="group.module" class="mb-4">
      <template #header>
        <div class="flex items-center gap-2">
          <span class="font-semibold">{{ group.module }}</span>
          <UBadge color="gray" variant="subtle">{{ group.permissions.length }}</UBadge>
        </div>
      </template>

      <DataTable :rows="group.permissions" :columns="columns">
        <template #actions-data="{ row }">
          <div class="flex gap-1 justify-end">
            <UButton size="2xs" variant="soft" icon="i-heroicons-pencil" :aria-label="t('common.edit')" @click="openEdit(row)" />
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
      </DataTable>
    </UCard>

    <UModal v-model="showCreate">
      <UCard>
        <template #header>
          <span class="font-semibold">{{ t('admin.permissions.createModalTitle') }}</span>
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
          <span class="font-semibold">{{ t('admin.permissions.editModalTitle') }}</span>
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
      :title="t('admin.permissions.deleteConfirmTitle')"
      :description="t('admin.permissions.deleteConfirmDescription')"
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
import type { PermissionRequest, PermissionResponse } from '~/features/roles/types'
import type { ColumnDef, FieldDef } from '~/shared/types'

definePageMeta({ middleware: 'admin' })

const { t } = useI18n()
const api = useApi()

const {
  data: permissions,
  pending,
  refresh
} = await useAsyncData('permissions', () => api<PermissionResponse[]>('/auth/permissions'))

const search = ref('')
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  const list = permissions.value ?? []
  if (!q) return list
  return list.filter(
    (p) => p.name.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q)
  )
})

const totalLabel = computed(() => {
  const count = permissions.value?.length ?? 0
  return count === 1 ? t('admin.permissions.total.one') : t('admin.permissions.total.other', { count })
})

const groups = computed(() => {
  const byModule = new Map<string, PermissionResponse[]>()
  for (const p of filtered.value) {
    const list = byModule.get(p.module) ?? []
    list.push(p)
    byModule.set(p.module, list)
  }
  return [...byModule.entries()]
    .map(([module, list]) => ({
      module,
      permissions: list.sort((a, b) => a.action.localeCompare(b.action))
    }))
    .sort((a, b) => a.module.localeCompare(b.module))
})

const columns = computed<ColumnDef<PermissionResponse>[]>(() => [
  { key: 'name', label: t('admin.permissions.columns.name'), sortable: true },
  { key: 'description', label: t('admin.permissions.columns.description') },
  { key: 'createdAt', label: t('admin.permissions.columns.created'), type: 'datetime' },
  { key: 'actions', label: '', class: 'text-right' }
])

const fields = computed<FieldDef[]>(() => [
  {
    name: 'name',
    label: t('admin.permissions.fields.name'),
    hint: t('admin.permissions.fields.nameHint'),
    required: true
  },
  { name: 'description', label: t('admin.permissions.fields.description'), type: 'textarea', rows: 2 }
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
} = useCrudModals<PermissionResponse, PermissionRequest>('/auth/permissions', refresh, {
  entityName: t('admin.entities.permission'),
  createDefaults: () => ({ name: '', description: '' }),
  toForm: (row) => ({ name: row.name, description: row.description ?? '' }),
  toPayload: (values) => ({ name: values.name, description: values.description || undefined })
})
</script>
