<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-xl font-bold">User Management</h1>
      <UButton icon="i-heroicons-plus" @click="openCreate">New User</UButton>
    </div>

    <UCard class="mb-4">
      <div class="flex flex-wrap items-end gap-4">
        <UFormGroup label="Search username" class="w-56">
          <UInput v-model="filters.username" placeholder="Search..." icon="i-heroicons-magnifying-glass" />
        </UFormGroup>
        <UFormGroup label="Role" class="w-40">
          <USelectMenu v-model="filters.role" :options="roleFilterOptions" option-attribute="label" value-attribute="value" />
        </UFormGroup>
        <UFormGroup label="Status" class="w-40">
          <USelectMenu v-model="filters.active" :options="statusFilterOptions" option-attribute="label" value-attribute="value" />
        </UFormGroup>
      </div>
    </UCard>

    <UCard>
      <UTable :rows="users?.content ?? []" :columns="columns" :loading="pending">
        <template #role-data="{ row }">
          <UBadge :color="row.role === 'ADMIN' ? 'primary' : 'gray'" variant="subtle">{{ row.role }}</UBadge>
        </template>
        <template #active-data="{ row }">
          <UBadge :color="row.active ? 'green' : 'red'" variant="subtle">{{ row.active ? 'Active' : 'Disabled' }}</UBadge>
        </template>
        <template #createdAt-data="{ row }">{{ formatDate(row.createdAt) }}</template>
        <template #actions-data="{ row }">
          <div class="flex items-center justify-end gap-1">
            <UButton
              size="xs" color="gray" variant="ghost"
              :disabled="row.username === username"
              :loading="actingId === row.id && action === 'role'"
              @click="onToggleRole(row)"
            >
              Make {{ row.role === 'ADMIN' ? 'User' : 'Admin' }}
            </UButton>
            <UButton
              size="xs" color="gray" variant="ghost"
              :disabled="row.username === username"
              :loading="actingId === row.id && action === 'status'"
              @click="onToggleStatus(row)"
            >
              {{ row.active ? 'Disable' : 'Enable' }}
            </UButton>
            <UButton
              size="xs" color="red" variant="ghost" icon="i-heroicons-trash"
              :disabled="row.username === username"
              @click="confirmDeleteUser = row"
            />
          </div>
        </template>
      </UTable>
      <p v-if="!pending && (users?.content ?? []).length === 0" class="text-sm text-gray-500 py-4 text-center">
        No users found.
      </p>
      <div v-if="users && users.totalPages > 1" class="flex justify-end pt-4">
        <UPagination v-model="page" :page-count="users.size" :total="users.totalElements" />
      </div>
    </UCard>

    <UModal v-model="showCreate">
      <UCard>
        <template #header>
          <span class="font-semibold">New User</span>
        </template>
        <UForm :state="createForm" class="space-y-4" @submit="onCreate">
          <UFormGroup label="Username" name="username" required>
            <UInput v-model="createForm.username" autocomplete="username" required />
          </UFormGroup>
          <UFormGroup label="Password" name="password" required help="At least 6 characters">
            <UInput v-model="createForm.password" type="password" autocomplete="new-password" required minlength="6" />
          </UFormGroup>
          <div class="grid grid-cols-2 gap-4 items-end">
            <UFormGroup label="Role" name="role">
              <USelectMenu v-model="createForm.role" :options="['USER', 'ADMIN']" />
            </UFormGroup>
            <UFormGroup label="Active" name="active">
              <UToggle v-model="createForm.active" />
            </UFormGroup>
          </div>
          <UAlert v-if="createError" color="red" variant="subtle" :title="createError" />
          <div class="flex justify-end gap-2 pt-2">
            <UButton type="submit" :loading="creating">Create</UButton>
          </div>
        </UForm>
      </UCard>
    </UModal>

    <UModal :model-value="!!confirmDeleteUser" @update:model-value="(v: boolean) => { if (!v) confirmDeleteUser = null }">
      <UCard v-if="confirmDeleteUser">
        <template #header>
          <span class="font-semibold">Delete user "{{ confirmDeleteUser.username }}"?</span>
        </template>
        <p class="text-sm text-gray-500 mb-4">This action cannot be undone.</p>
        <div class="flex justify-end gap-2">
          <UButton color="gray" variant="ghost" @click="confirmDeleteUser = null">Cancel</UButton>
          <UButton color="red" :loading="deleting" @click="onDelete">Delete</UButton>
        </div>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { CreateUserRequest, UserFilter, UserResponse } from '~/features/users/types'
import type { PageResponse } from '~/shared/types'

definePageMeta({ middleware: 'admin' })

const api = useApi()
const toast = useToast()
const { username } = storeToRefs(useAuth())

const page = ref(1)
const filters = reactive({
  username: '',
  role: '' as '' | 'USER' | 'ADMIN',
  active: '' as '' | 'true' | 'false'
})

const roleFilterOptions = [
  { label: 'All roles', value: '' },
  { label: 'User', value: 'USER' },
  { label: 'Admin', value: 'ADMIN' }
]
const statusFilterOptions = [
  { label: 'All statuses', value: '' },
  { label: 'Active', value: 'true' },
  { label: 'Disabled', value: 'false' }
]

function buildQuery(): UserFilter {
  return {
    page: page.value,
    size: 10,
    username: filters.username || undefined,
    role: filters.role || undefined,
    active: filters.active === '' ? undefined : filters.active === 'true'
  }
}

const { data: users, pending, refresh } = await useAsyncData(
  'users',
  () => api<PageResponse<UserResponse>>('/auth/users', { query: buildQuery() })
)

watch(page, () => refresh())
watch(() => filters.role, () => { page.value = 1; refresh() })
watch(() => filters.active, () => { page.value = 1; refresh() })

// Debounced so we don't fire a request on every keystroke.
let searchTimer: ReturnType<typeof setTimeout>
watch(() => filters.username, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    refresh()
  }, 400)
})

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'username', label: 'Username' },
  { key: 'role', label: 'Role' },
  { key: 'active', label: 'Status' },
  { key: 'createdAt', label: 'Created' },
  { key: 'actions', label: '', class: 'text-right' }
]

const actingId = ref<number | null>(null)
const action = ref<'role' | 'status' | null>(null)
const confirmDeleteUser = ref<UserResponse | null>(null)
const deleting = ref(false)

const showCreate = ref(false)
const creating = ref(false)
const createError = ref('')
const createForm = reactive<CreateUserRequest>({ username: '', password: '', role: 'USER', active: true })

function openCreate() {
  createForm.username = ''
  createForm.password = ''
  createForm.role = 'USER'
  createForm.active = true
  createError.value = ''
  showCreate.value = true
}

async function onCreate() {
  creating.value = true
  createError.value = ''
  try {
    await api('/auth/users', { method: 'POST', body: createForm })
    toast.add({ title: `User "${createForm.username}" created`, color: 'green' })
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
    toast.add({ title: `${row.username} is now ${nextRole}`, color: 'green' })
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
  try {
    await api(`/auth/users/${row.id}/status`, { method: 'PUT', body: { active: !row.active } })
    toast.add({ title: `${row.username} ${row.active ? 'disabled' : 'enabled'}`, color: 'green' })
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
    toast.add({ title: 'User deleted', color: 'green' })
    confirmDeleteUser.value = null
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    deleting.value = false
  }
}
</script>
