<template>
  <div>
    <PageHeader title="User Management" :description="totalLabel">
      <template #actions>
        <UButton icon="i-heroicons-plus" @click="openCreate">New User</UButton>
      </template>
    </PageHeader>

    <UCard class="mb-4">
      <div class="flex flex-wrap items-end gap-4">
        <UFormGroup label="Search username" class="w-56">
          <UInput v-model="filters.username" placeholder="Search..." icon="i-heroicons-magnifying-glass">
            <template v-if="filters.username" #trailing>
              <UButton color="gray" variant="link" icon="i-heroicons-x-mark" :padded="false" @click="filters.username = ''" />
            </template>
          </UInput>
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
          <UBadge :color="row.active ? 'teal' : 'red'" variant="subtle">{{ row.active ? 'Active' : 'Disabled' }}</UBadge>
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
        <template #empty-state>
          <EmptyState icon="i-heroicons-shield-check" title="No users found" description="Try adjusting your search or filters." />
        </template>
      </UTable>
      <div v-if="users && users.totalPages > 1" class="flex justify-end pt-4">
        <UPagination v-model="page" :page-count="users.size" :total="users.totalElements" />
      </div>
    </UCard>

    <UModal v-model="showCreate">
      <UCard>
        <template #header>
          <span class="font-semibold">New User</span>
        </template>
        <DynamicForm
          v-model="createForm"
          :fields="userFields"
          :loading="creating"
          :error="createError"
          submit-label="Create"
          cancelable
          @submit="onCreate"
          @cancel="showCreate = false"
        />
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
import type { FieldDef, PageResponse } from '~/shared/types'

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

const totalLabel = computed(() => {
  const count = users.value?.totalElements ?? 0
  return count === 1 ? '1 user' : `${count} users`
})

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

const userFields: FieldDef[] = [
  { name: 'username', required: true },
  { name: 'password', type: 'password', required: true, hint: 'At least 6 characters' },
  {
    name: 'role',
    type: 'select',
    wrapper: 'half',
    options: [
      { label: 'User', value: 'USER' },
      { label: 'Admin', value: 'ADMIN' }
    ]
  },
  { name: 'active', type: 'switch', wrapper: 'half' }
]

const createForm = ref<Record<string, any>>({})

function openCreate() {
  createForm.value = { username: '', password: '', role: 'USER', active: true }
  createError.value = ''
  showCreate.value = true
}

async function onCreate(values: Record<string, any>) {
  creating.value = true
  createError.value = ''
  try {
    await api('/auth/users', { method: 'POST', body: values as CreateUserRequest })
    toast.add({ title: `User "${values.username}" created`, color: 'green' })
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
