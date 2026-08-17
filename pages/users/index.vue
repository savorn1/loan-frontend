<template>
  <div>
    <PageHeader :title="t('admin.users.title')" :description="totalLabel">
      <template #actions>
        <UButton icon="i-heroicons-plus" @click="openCreate">{{
          t('admin.users.newUser')
        }}</UButton>
      </template>
    </PageHeader>

    <UCard class="mb-4">
      <div class="flex flex-wrap items-end gap-4">
        <UFormGroup :label="t('admin.users.searchLabel')" class="w-full sm:w-56">
          <UInput
            v-model="filters.username"
            :placeholder="t('admin.users.searchPlaceholder')"
            icon="i-heroicons-magnifying-glass"
          >
            <template v-if="filters.username" #trailing>
              <UButton
                color="gray"
                variant="link"
                icon="i-heroicons-x-mark"
                :aria-label="t('common.clearSearch')"
                :padded="false"
                @click="filters.username = ''"
              />
            </template>
          </UInput>
        </UFormGroup>
        <UFormGroup :label="t('admin.users.roleLabel')" class="w-full sm:w-40">
          <USelectMenu
            v-model="filters.role"
            :options="roleFilterOptions"
            option-attribute="label"
            value-attribute="value"
          />
        </UFormGroup>
        <UFormGroup :label="t('admin.users.statusLabel')" class="w-full sm:w-40">
          <USelectMenu
            v-model="filters.status"
            :options="statusFilterOptions"
            option-attribute="label"
            value-attribute="value"
          />
        </UFormGroup>
      </div>
    </UCard>

    <UCard>
      <UAlert
        v-if="fetchError"
        color="red"
        variant="subtle"
        class="mb-4"
        :title="apiErrorMessage(fetchError)"
      />

      <DataTable
        :rows="users?.content ?? []"
        :columns="columns"
        :loading="pending"
        numbered
        refreshable
        :row-number-start="(page - 1) * pageSize"
        @refresh="refresh"
      >
        <template #actions-data="{ row }">
          <div class="flex items-center justify-end gap-1">
            <UButton
              size="xs"
              color="gray"
              variant="ghost"
              :disabled="row.username === username"
              :loading="actingId === row.id && action === 'role'"
              @click="onToggleRole(row)"
            >
              {{
                row.role === 'ADMIN'
                  ? t('admin.users.actions.makeUser')
                  : t('admin.users.actions.makeAdmin')
              }}
            </UButton>
            <UButton
              size="xs"
              color="gray"
              variant="ghost"
              :disabled="row.username === username"
              :loading="actingId === row.id && action === 'status'"
              @click="onToggleStatus(row)"
            >
              {{
                row.status === 'ACTIVE'
                  ? t('admin.users.actions.disable')
                  : t('admin.users.actions.enable')
              }}
            </UButton>
            <UButton size="xs" color="gray" variant="ghost" @click="openRoles(row)">{{
              t('admin.users.actions.roles')
            }}</UButton>
            <UButton size="xs" color="gray" variant="ghost" @click="openBranch(row)">{{
              t('admin.users.actions.branch')
            }}</UButton>
            <UButton
              size="xs"
              color="red"
              variant="ghost"
              icon="i-heroicons-trash"
              :aria-label="t('common.delete')"
              :disabled="row.username === username"
              @click="confirmDeleteUser = row"
            />
          </div>
        </template>
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-shield-check"
            :title="t('admin.users.empty.title')"
            :description="t('admin.users.empty.description')"
          />
        </template>
      </DataTable>
      <div v-if="users && users.totalElements > 0" class="pt-4">
        <DataPagination
          v-model:page="page"
          v-model:page-size="pageSize"
          :total="users.totalElements"
        />
      </div>
    </UCard>

    <UModal v-model="showCreate">
      <UCard>
        <template #header>
          <span class="font-semibold">{{ t('admin.users.createModalTitle') }}</span>
        </template>
        <DynamicForm
          v-model="createForm"
          :fields="userFields"
          :loading="creating"
          :error="createError"
          :submit-label="t('common.create')"
          cancelable
          @submit="onCreate"
          @cancel="showCreate = false"
        />
      </UCard>
    </UModal>

    <UModal
      :model-value="!!confirmDeleteUser"
      @update:model-value="
        (v: boolean) => {
          if (!v) confirmDeleteUser = null
        }
      "
    >
      <UCard v-if="confirmDeleteUser">
        <template #header>
          <span class="font-semibold">{{
            t('admin.users.deleteConfirmTitle', { username: confirmDeleteUser.username })
          }}</span>
        </template>
        <p class="text-sm text-gray-500 mb-4">{{ t('admin.users.deleteConfirmDescription') }}</p>
        <div class="flex justify-end gap-2">
          <UButton color="gray" variant="ghost" @click="confirmDeleteUser = null">{{
            t('common.cancel')
          }}</UButton>
          <UButton color="red" :loading="deleting" @click="onDelete">{{
            t('common.delete')
          }}</UButton>
        </div>
      </UCard>
    </UModal>

    <UModal v-model="showRoles">
      <UCard v-if="rolesTargetUser">
        <template #header>
          <span class="font-semibold">{{
            t('admin.users.rolesModal.title', { username: rolesTargetUser.username })
          }}</span>
        </template>
        <div
          v-if="allRolesPending || userRolesPending"
          class="py-6 text-center text-sm text-gray-500 dark:text-gray-400"
        >
          {{ t('admin.shared.loading') }}
        </div>
        <ul v-else-if="allRoles.length" class="space-y-2 max-h-80 overflow-y-auto pr-1">
          <li
            v-for="r in allRoles"
            :key="r.id"
            class="flex items-start gap-2.5 py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0"
          >
            <UCheckbox
              :model-value="assignedRoleIds.has(r.id)"
              :loading="togglingRoleId === r.id"
              @update:model-value="(v: boolean) => onToggleUserRole(r, v)"
            />
            <div class="min-w-0">
              <p class="text-sm font-medium text-gray-900 dark:text-white">{{ r.name }}</p>
              <p v-if="r.description" class="text-xs text-gray-500 dark:text-gray-400">
                {{ r.description }}
              </p>
            </div>
          </li>
        </ul>
        <EmptyState
          v-else
          icon="i-heroicons-shield-check"
          :title="t('admin.users.rolesModal.emptyTitle')"
          :description="t('admin.users.rolesModal.emptyDescription')"
        >
          <template #action>
            <UButton to="/roles" variant="soft">{{
              t('admin.users.rolesModal.goToRoles')
            }}</UButton>
          </template>
        </EmptyState>
      </UCard>
    </UModal>

    <UModal v-model="showBranch">
      <UCard v-if="branchTargetUser">
        <template #header>
          <span class="font-semibold">{{
            t('admin.users.branchModal.title', { username: branchTargetUser.username })
          }}</span>
        </template>
        <UFormGroup :label="t('admin.users.fields.branch')">
          <USelectMenu
            v-model="branchForm.branchId"
            :options="branchOptions"
            option-attribute="label"
            value-attribute="value"
          />
        </UFormGroup>
        <div class="flex justify-end gap-2 mt-4">
          <UButton color="gray" variant="ghost" @click="showBranch = false">{{
            t('common.cancel')
          }}</UButton>
          <UButton :loading="savingBranch" @click="onSaveBranch">{{
            t('common.saveChanges')
          }}</UButton>
        </div>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type {
  AssignUserRoleRequest,
  CreateUserRequest,
  UpdateBranchRequest,
  UserFilter,
  UserResponse,
  UserRoleResponse
} from '~/features/users/types'
import type { RoleResponse } from '~/features/roles/types'
import type { BranchResponse } from '~/features/branches/types'
import type { ColumnDef, FieldDef, PageResponse } from '~/shared/types'

definePageMeta({ middleware: 'admin' })

const { t } = useI18n()
const api = useApi()
const toast = useToast()
const { username } = storeToRefs(useAuth())

const page = ref(1)
const pageSize = ref(10)
const filters = reactive({
  username: '',
  role: '' as '' | 'USER' | 'ADMIN',
  status: '' as '' | 'ACTIVE' | 'INACTIVE'
})

const roleFilterOptions = computed(() => [
  { label: t('admin.users.roleOptions.all'), value: '' },
  { label: t('admin.users.roleOptions.user'), value: 'USER' },
  { label: t('admin.users.roleOptions.admin'), value: 'ADMIN' }
])
const statusFilterOptions = computed(() => [
  { label: t('admin.users.statusOptions.all'), value: '' },
  { label: t('admin.users.statusOptions.active'), value: 'ACTIVE' },
  { label: t('admin.users.statusOptions.disabled'), value: 'INACTIVE' }
])

function buildQuery(): UserFilter {
  return {
    page: page.value,
    size: pageSize.value,
    username: filters.username || undefined,
    role: filters.role || undefined,
    status: filters.status || undefined
  }
}

const {
  data: users,
  pending,
  error: fetchError,
  refresh
} = await useAsyncData('users', () =>
  api<PageResponse<UserResponse>>('/auth/users', { query: buildQuery() })
)

const totalLabel = computed(() => {
  const count = users.value?.totalElements ?? 0
  return count === 1 ? t('admin.users.total.one') : t('admin.users.total.other', { count })
})

watch(page, () => refresh())
watch(pageSize, () => {
  page.value = 1
  refresh()
})
watch(
  () => filters.role,
  () => {
    page.value = 1
    refresh()
  }
)
watch(
  () => filters.status,
  () => {
    page.value = 1
    refresh()
  }
)

// Debounced so we don't fire a request on every keystroke.
let searchTimer: ReturnType<typeof setTimeout>
watch(
  () => filters.username,
  () => {
    clearTimeout(searchTimer)
    searchTimer = setTimeout(() => {
      page.value = 1
      refresh()
    }, 400)
  }
)

const { data: branchesData } = await useAsyncData('branches-all', () =>
  api<BranchResponse[]>('/branches')
)
const branches = computed(() => branchesData.value ?? [])
const branchOptions = computed(() => [
  { label: t('admin.users.branchOptions.none'), value: '' },
  ...branches.value.map((b) => ({ label: b.name, value: b.id }))
])

const columns = computed<ColumnDef<UserResponse>[]>(() => [
  { key: 'username', label: t('admin.users.columns.username') },
  { key: 'branchName', label: t('admin.users.columns.branch') },
  {
    key: 'role',
    label: t('admin.users.columns.role'),
    type: 'badge',
    color: (row) => (row.role === 'ADMIN' ? 'primary' : 'gray')
  },
  {
    key: 'status',
    label: t('admin.users.columns.status'),
    type: 'boolean',
    value: (row) => row.status === 'ACTIVE',
    trueLabel: t('admin.users.statusOptions.active'),
    falseLabel: t('admin.users.statusOptions.disabled'),
    trueColor: 'teal',
    falseColor: 'red'
  },
  { key: 'createdAt', label: t('admin.users.columns.created'), type: 'datetime' },
  { key: 'actions', label: '', class: 'text-right' }
])

const actingId = ref<number | null>(null)
const action = ref<'role' | 'status' | null>(null)
const confirmDeleteUser = ref<UserResponse | null>(null)
const deleting = ref(false)

const showCreate = ref(false)
const creating = ref(false)
const createError = ref('')

const userFields = computed<FieldDef[]>(() => [
  { name: 'username', label: t('admin.users.fields.username'), required: true },
  {
    name: 'password',
    label: t('admin.users.fields.password'),
    type: 'password',
    required: true,
    hint: t('admin.users.fields.passwordHint')
  },
  {
    name: 'role',
    label: t('admin.users.fields.role'),
    type: 'select',
    wrapper: 'half',
    options: [
      { label: t('admin.users.roleOptions.user'), value: 'USER' },
      { label: t('admin.users.roleOptions.admin'), value: 'ADMIN' }
    ]
  },
  { name: 'active', label: t('admin.users.fields.active'), type: 'switch', wrapper: 'half' },
  {
    name: 'branchId',
    label: t('admin.users.fields.branch'),
    type: 'select',
    wrapper: 'half',
    options: branchOptions.value
  }
])

const createForm = ref<Record<string, any>>({})

function openCreate() {
  createForm.value = { username: '', password: '', role: 'USER', active: true, branchId: '' }
  createError.value = ''
  showCreate.value = true
}

async function onCreate(values: Record<string, any>) {
  creating.value = true
  createError.value = ''
  try {
    const { active, ...rest } = values
    const payload = {
      ...rest,
      status: active ? 'ACTIVE' : 'INACTIVE',
      branchId: values.branchId || undefined
    } as CreateUserRequest
    await api('/auth/users', { method: 'POST', body: payload })
    toast.add({
      title: t('admin.users.toast.created', { username: values.username }),
      color: 'green'
    })
    showCreate.value = false
    page.value = 1
    await refresh()
  } catch (err) {
    createError.value = apiErrorMessage(err)
  } finally {
    creating.value = false
  }
}

async function onToggleRole(row: UserResponse) {
  actingId.value = row.id
  action.value = 'role'
  const nextRole = row.role === 'ADMIN' ? 'USER' : 'ADMIN'
  try {
    await api(`/auth/users/${row.id}/role`, { method: 'PUT', body: { role: nextRole } })
    const roleLabel =
      nextRole === 'ADMIN' ? t('admin.users.roleOptions.admin') : t('admin.users.roleOptions.user')
    toast.add({
      title: t('admin.users.toast.roleChanged', { username: row.username, role: roleLabel }),
      color: 'green'
    })
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    actingId.value = null
    action.value = null
  }
}

async function onToggleStatus(row: UserResponse) {
  actingId.value = row.id
  action.value = 'status'
  const nextStatus = row.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
  try {
    await api(`/auth/users/${row.id}/status`, { method: 'PUT', body: { status: nextStatus } })
    toast.add({
      title:
        nextStatus === 'INACTIVE'
          ? t('admin.users.toast.disabled', { username: row.username })
          : t('admin.users.toast.enabled', { username: row.username }),
      color: 'green'
    })
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    actingId.value = null
    action.value = null
  }
}

async function onDelete() {
  if (!confirmDeleteUser.value) return
  deleting.value = true
  try {
    await api(`/auth/users/${confirmDeleteUser.value.id}`, { method: 'DELETE' })
    toast.add({ title: t('admin.users.toast.deleted'), color: 'green' })
    confirmDeleteUser.value = null
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    deleting.value = false
  }
}

// ── Roles (additive RBAC — see features/roles/types.ts) ────────────────────
const { data: allRolesData, pending: allRolesPending } = await useAsyncData('roles-all', () =>
  api<RoleResponse[]>('/auth/roles')
)
const allRoles = computed(() => allRolesData.value ?? [])

const showRoles = ref(false)
const rolesTargetUser = ref<UserResponse | null>(null)
const userRoles = ref<UserRoleResponse[]>([])
const userRolesPending = ref(false)
const togglingRoleId = ref<number | null>(null)

const assignedRoleIds = computed(() => new Set(userRoles.value.map((ur) => ur.roleId)))

async function openRoles(row: UserResponse) {
  rolesTargetUser.value = row
  showRoles.value = true
  userRolesPending.value = true
  try {
    userRoles.value = await api<UserRoleResponse[]>(`/auth/users/${row.id}/roles`)
  } finally {
    userRolesPending.value = false
  }
}

async function onToggleUserRole(role: RoleResponse, assign: boolean) {
  if (!rolesTargetUser.value) return
  const userId = rolesTargetUser.value.id
  togglingRoleId.value = role.id
  try {
    if (assign) {
      const payload: AssignUserRoleRequest = { roleId: role.id }
      await api(`/auth/users/${userId}/roles`, { method: 'POST', body: payload })
    } else {
      await api(`/auth/users/${userId}/roles/${role.id}`, { method: 'DELETE' })
    }
    userRoles.value = await api<UserRoleResponse[]>(`/auth/users/${userId}/roles`)
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    togglingRoleId.value = null
  }
}

// ── Branch assignment ───────────────────────────────────────────────────────
const showBranch = ref(false)
const savingBranch = ref(false)
const branchTargetUser = ref<UserResponse | null>(null)
const branchForm = reactive<{ branchId: number | '' }>({ branchId: '' })

function openBranch(row: UserResponse) {
  branchTargetUser.value = row
  branchForm.branchId = row.branchId ?? ''
  showBranch.value = true
}

async function onSaveBranch() {
  if (!branchTargetUser.value) return
  savingBranch.value = true
  try {
    const payload: UpdateBranchRequest = { branchId: branchForm.branchId || null }
    await api(`/auth/users/${branchTargetUser.value.id}/branch`, { method: 'PUT', body: payload })
    toast.add({
      title: t('admin.users.toast.branchChanged', { username: branchTargetUser.value.username }),
      color: 'green'
    })
    showBranch.value = false
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    savingBranch.value = false
  }
}
</script>
