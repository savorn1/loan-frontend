<template>
  <div v-if="role">
    <div class="flex items-center justify-between mb-6 gap-4">
      <div class="min-w-0">
        <UButton
          to="/roles"
          variant="link"
          icon="i-heroicons-arrow-left"
          size="xs"
          class="mb-0.5 px-0"
        >
          {{ t('admin.roles.detail.backToRoles') }}
        </UButton>
        <h1 class="text-xl font-bold truncate">{{ role.name }}</h1>
      </div>
      <UButton
        color="red"
        variant="soft"
        icon="i-heroicons-trash"
        @click="confirmDeleteRole = true"
      >
        {{ t('admin.roles.detail.deleteRole') }}
      </UButton>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <UCard>
        <template #header>
          <span class="font-semibold">{{ t('admin.roles.detail.detailsHeader') }}</span>
        </template>
        <DynamicForm
          v-model="detailsForm"
          :fields="detailsFields"
          :loading="savingDetails"
          :error="detailsError"
          :submit-label="t('common.saveChanges')"
          @submit="onSaveDetails"
        />
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <span class="font-semibold">{{ t('admin.roles.detail.permissionsHeader') }}</span>
            <UBadge color="gray" variant="subtle">{{ assignedPermissionIds.size }}</UBadge>
          </div>
        </template>
        <div
          v-if="permissionsPending"
          class="py-6 text-center text-sm text-gray-500 dark:text-gray-400"
        >
          {{ t('admin.shared.loading') }}
        </div>
        <div v-else-if="allPermissions.length" class="space-y-2.5 max-h-96 overflow-y-auto pr-1">
          <div
            v-for="group in permissionGroups"
            :key="group.module"
            class="rounded-lg border border-gray-200 dark:border-gray-700 p-3"
          >
            <div class="flex items-center justify-between mb-2.5">
              <p
                class="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500"
              >
                {{ group.module }}
              </p>
              <UCheckbox
                :model-value="moduleState(group).checked"
                :indeterminate="moduleState(group).indeterminate"
                :loading="togglingModule === group.module"
                :label="t('admin.roles.detail.allLabel')"
                @update:model-value="(v: boolean) => onToggleModule(group, v)"
              />
            </div>
            <div class="flex flex-wrap gap-1.5">
              <UButton
                v-for="p in group.permissions"
                :key="p.id"
                :title="p.description ?? undefined"
                size="2xs"
                :variant="assignedPermissionIds.has(p.id) ? 'solid' : 'outline'"
                :color="assignedPermissionIds.has(p.id) ? 'primary' : 'gray'"
                :icon="assignedPermissionIds.has(p.id) ? 'i-heroicons-check' : undefined"
                :loading="togglingPermissionId === p.id"
                :disabled="togglingModule === group.module"
                @click="onTogglePermission(p, !assignedPermissionIds.has(p.id))"
              >
                {{ humanize(p.action) }}
              </UButton>
            </div>
          </div>
        </div>
        <EmptyState
          v-else
          icon="i-heroicons-key"
          :title="t('admin.roles.detail.emptyPermissionsTitle')"
          :description="t('admin.roles.detail.emptyPermissionsDescription')"
        >
          <template #action>
            <UButton to="/permissions" variant="soft">{{
              t('admin.roles.detail.goToPermissions')
            }}</UButton>
          </template>
        </EmptyState>
      </UCard>

      <UCard class="lg:col-span-2">
        <template #header>
          <div class="flex items-center justify-between">
            <span class="font-semibold">{{ t('admin.roles.detail.assignedUsersHeader') }}</span>
            <UButton size="xs" icon="i-heroicons-plus" @click="openAssignUser">{{
              t('admin.roles.detail.assignUser')
            }}</UButton>
          </div>
        </template>
        <DataTable :rows="roleUsers ?? []" :columns="userColumns" :loading="usersPending">
          <template #actions-data="{ row }">
            <UButton
              size="2xs"
              color="red"
              variant="soft"
              icon="i-heroicons-x-mark"
              :loading="removingUserId === row.id"
              @click="onRemoveUser(row)"
            >
              {{ t('admin.roles.detail.removeUser') }}
            </UButton>
          </template>
          <template #empty-state>
            <EmptyState
              icon="i-heroicons-user-group"
              :title="t('admin.roles.detail.emptyUsersTitle')"
              :description="t('admin.roles.detail.emptyUsersDescription')"
            >
              <template #action>
                <UButton icon="i-heroicons-plus" @click="openAssignUser">{{
                  t('admin.roles.detail.assignUser')
                }}</UButton>
              </template>
            </EmptyState>
          </template>
        </DataTable>
      </UCard>
    </div>

    <UModal v-model="showAssignUser">
      <UCard>
        <template #header>
          <span class="font-semibold">{{
            t('admin.roles.detail.assignUserModalTitle', { roleName: role.name })
          }}</span>
        </template>
        <DynamicForm
          v-model="assignUserForm"
          :fields="assignUserFields"
          :loading="assigningUser"
          :error="assignUserError"
          :submit-label="t('admin.shared.assign')"
          cancelable
          @submit="onAssignUser"
          @cancel="showAssignUser = false"
        />
      </UCard>
    </UModal>

    <ConfirmModal
      v-model="confirmDeleteRole"
      :title="t('admin.roles.deleteConfirmTitle')"
      :description="
        t('admin.roles.deleteConfirmDescription', {
          userCount: role.userCount,
          permissionCount: role.permissionCount
        })
      "
      :confirm-label="t('common.delete')"
      color="red"
      :loading="deletingRole"
      @confirm="onDeleteRole"
    />
  </div>
  <div v-else-if="roleError" class="py-8">
    <ErrorState :title="t('common.errorState.title')" :description="apiErrorMessage(roleError)">
      <template #action>
        <UButton
          size="sm"
          variant="soft"
          icon="i-heroicons-arrow-path"
          :loading="rolePending"
          @click="refreshRole()"
        >
          {{ t('common.errorState.retry') }}
        </UButton>
      </template>
    </ErrorState>
  </div>
  <div v-else class="flex justify-center py-16">
    <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-gray-400" />
  </div>
</template>

<script setup lang="ts">
import type {
  AssignPermissionRequest,
  AssignUserToRoleRequest,
  PermissionResponse,
  RoleRequest,
  RoleResponse,
  RolePermissionResponse
} from '~/features/roles/types'
import type { UserResponse, UserRoleResponse } from '~/features/users/types'
import type { ColumnDef, FieldDef, PageResponse } from '~/shared/types'

definePageMeta({ middleware: 'admin' })

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const api = useApi()
const toast = useToast()

const roleId = route.params.id as string

const {
  data: role,
  error: roleError,
  pending: rolePending,
  refresh: refreshRole
} = await useAsyncData(`role-${roleId}`, () => api<RoleResponse>(`/auth/roles/${roleId}`))

// ── Details ─────────────────────────────────────────────────────────────
const detailsFields = computed<FieldDef[]>(() => [
  { name: 'name', label: t('admin.roles.fields.name'), required: true },
  {
    name: 'code',
    label: t('admin.roles.fields.code'),
    hint: t('admin.roles.fields.codeHint'),
    required: true
  },
  { name: 'description', label: t('admin.roles.fields.description'), type: 'textarea', rows: 2 }
])
const detailsForm = ref<Record<string, any>>({
  name: role.value?.name ?? '',
  code: role.value?.code ?? '',
  description: role.value?.description ?? ''
})
const savingDetails = ref(false)
const detailsError = ref('')

async function onSaveDetails(values: Record<string, any>) {
  savingDetails.value = true
  detailsError.value = ''
  try {
    const payload: RoleRequest = {
      name: values.name,
      code: values.code,
      description: values.description || undefined
    }
    await api(`/auth/roles/${roleId}`, { method: 'PUT', body: payload })
    toast.add({ title: t('admin.roles.detail.toast.updated'), color: 'green' })
    await refreshRole()
  } catch (err) {
    detailsError.value = apiErrorMessage(err)
  } finally {
    savingDetails.value = false
  }
}

// ── Permissions ─────────────────────────────────────────────────────────
const { data: allPermissionsData } = await useAsyncData('permissions-all', () =>
  api<PermissionResponse[]>('/auth/permissions')
)
const allPermissions = computed(() => allPermissionsData.value ?? [])

const {
  data: rolePermissions,
  pending: permissionsPending,
  refresh: refreshRolePermissions
} = await useAsyncData(`role-${roleId}-permissions`, () =>
  api<RolePermissionResponse[]>(`/auth/roles/${roleId}/permissions`)
)

const assignedPermissionIds = computed(
  () => new Set((rolePermissions.value ?? []).map((rp) => rp.permissionId))
)

const permissionGroups = computed(() => {
  const byModule = new Map<string, PermissionResponse[]>()
  for (const p of allPermissions.value) {
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

const togglingPermissionId = ref<number | null>(null)

async function onTogglePermission(permission: PermissionResponse, assign: boolean) {
  togglingPermissionId.value = permission.id
  try {
    if (assign) {
      const payload: AssignPermissionRequest = { permissionId: permission.id }
      await api(`/auth/roles/${roleId}/permissions`, { method: 'POST', body: payload })
    } else {
      await api(`/auth/roles/${roleId}/permissions/${permission.id}`, { method: 'DELETE' })
    }
    await Promise.all([refreshRolePermissions(), refreshRole()])
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    togglingPermissionId.value = null
  }
}

function moduleState(group: { module: string; permissions: PermissionResponse[] }) {
  const assignedCount = group.permissions.filter((p) =>
    assignedPermissionIds.value.has(p.id)
  ).length
  return {
    checked: assignedCount === group.permissions.length,
    indeterminate: assignedCount > 0 && assignedCount < group.permissions.length
  }
}

const togglingModule = ref<string | null>(null)

async function onToggleModule(
  group: { module: string; permissions: PermissionResponse[] },
  assign: boolean
) {
  togglingModule.value = group.module
  try {
    const targets = group.permissions.filter(
      (p) => assignedPermissionIds.value.has(p.id) !== assign
    )
    await Promise.all(
      targets.map((p) =>
        assign
          ? api(`/auth/roles/${roleId}/permissions`, {
              method: 'POST',
              body: { permissionId: p.id } satisfies AssignPermissionRequest
            })
          : api(`/auth/roles/${roleId}/permissions/${p.id}`, { method: 'DELETE' })
      )
    )
    await Promise.all([refreshRolePermissions(), refreshRole()])
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    togglingModule.value = null
  }
}

// ── Assigned users ──────────────────────────────────────────────────────
const {
  data: roleUsers,
  pending: usersPending,
  refresh: refreshRoleUsers
} = await useAsyncData(`role-${roleId}-users`, () =>
  api<UserRoleResponse[]>(`/auth/roles/${roleId}/users`)
)

const userColumns = computed<ColumnDef<UserRoleResponse>[]>(() => [
  { key: 'username', label: t('admin.roles.detail.userColumn') },
  { key: 'createdAt', label: t('admin.roles.detail.assignedColumn'), type: 'datetime' },
  { key: 'actions', label: '', class: 'text-right' }
])

const showAssignUser = ref(false)
const assigningUser = ref(false)
const assignUserError = ref('')
const assignUserForm = ref<Record<string, any>>({})

const assignedUserIds = computed(() => new Set((roleUsers.value ?? []).map((ru) => ru.userId)))

async function searchUsers(query: string) {
  const result = await api<PageResponse<UserResponse>>('/auth/users', {
    query: { username: query, size: 20 }
  })
  return result.content
    .filter((u) => !assignedUserIds.value.has(u.id))
    .map((u) => ({ label: u.username, value: u.id }))
}

const assignUserFields = computed<FieldDef[]>(() => [
  {
    name: 'userId',
    label: t('admin.roles.detail.userFieldLabel'),
    type: 'relationship',
    required: true,
    search: searchUsers,
    placeholder: t('admin.roles.detail.userFieldPlaceholder')
  }
])

function openAssignUser() {
  assignUserForm.value = { userId: undefined }
  assignUserError.value = ''
  showAssignUser.value = true
}

async function onAssignUser(values: Record<string, any>) {
  assigningUser.value = true
  assignUserError.value = ''
  try {
    const payload: AssignUserToRoleRequest = { userId: values.userId }
    await api(`/auth/roles/${roleId}/users`, { method: 'POST', body: payload })
    toast.add({ title: t('admin.roles.detail.toast.assigned'), color: 'green' })
    showAssignUser.value = false
    await Promise.all([refreshRoleUsers(), refreshRole()])
  } catch (err) {
    assignUserError.value = apiErrorMessage(err)
  } finally {
    assigningUser.value = false
  }
}

const removingUserId = ref<number | null>(null)

async function onRemoveUser(row: UserRoleResponse) {
  removingUserId.value = row.id
  try {
    await api(`/auth/roles/${roleId}/users/${row.userId}`, { method: 'DELETE' })
    toast.add({
      title: t('admin.roles.detail.toast.removed', { username: row.username }),
      color: 'green'
    })
    await Promise.all([refreshRoleUsers(), refreshRole()])
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    removingUserId.value = null
  }
}

// ── Delete role ─────────────────────────────────────────────────────────
const confirmDeleteRole = ref(false)
const deletingRole = ref(false)

async function onDeleteRole() {
  deletingRole.value = true
  try {
    await api(`/auth/roles/${roleId}`, { method: 'DELETE' })
    toast.add({ title: t('admin.roles.detail.toast.deleted'), color: 'green' })
    await router.push('/roles')
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
    confirmDeleteRole.value = false
  } finally {
    deletingRole.value = false
  }
}
</script>
