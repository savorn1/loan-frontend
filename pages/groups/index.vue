<template>
  <div>
    <PageHeader :title="t('groups.list.title')" :description="totalLabel">
      <template #actions>
        <UButton icon="i-heroicons-plus" @click="showCreate = true">{{
          t('groups.list.newGroup')
        }}</UButton>
      </template>
    </PageHeader>

    <UCard class="mb-4">
      <div class="flex flex-wrap items-end gap-4">
        <UFormGroup :label="t('common.search')" class="w-full sm:w-56">
          <UInput
            v-model="filters.search"
            :placeholder="t('groups.list.searchPlaceholder')"
            icon="i-heroicons-magnifying-glass"
          >
            <template v-if="filters.search" #trailing>
              <UButton
                color="gray"
                variant="link"
                icon="i-heroicons-x-mark"
                :aria-label="t('common.clearSearch')"
                :padded="false"
                @click="filters.search = ''"
              />
            </template>
          </UInput>
        </UFormGroup>
        <UFormGroup :label="t('groups.list.branchLabel')" class="w-full sm:w-48">
          <USelectMenu
            v-model="filters.branchId"
            :options="branchFilterOptions"
            option-attribute="label"
            value-attribute="value"
          />
        </UFormGroup>
        <UFormGroup :label="t('groups.list.statusLabel')" class="w-full sm:w-40">
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
        :rows="groups?.content ?? []"
        :columns="columns"
        :loading="pending"
        numbered
        refreshable
        :row-number-start="(page - 1) * pageSize"
        @select="onSelect"
        @refresh="refresh"
      >
        <template #actions-data="{ row }">
          <div class="flex items-center justify-end gap-1" @click.stop>
            <UButton
              v-if="row.status !== 'CLOSED'"
              size="xs"
              color="gray"
              variant="ghost"
              :loading="actingId === row.id && action === 'status'"
              @click="onToggleStatus(row)"
            >
              {{
                row.status === 'ACTIVE'
                  ? t('groups.list.actions.deactivate')
                  : t('groups.list.actions.activate')
              }}
            </UButton>
            <UButton
              v-if="row.status !== 'CLOSED'"
              size="xs"
              color="orange"
              variant="ghost"
              icon="i-heroicons-lock-closed"
              :aria-label="t('groups.list.actions.close')"
              @click="confirmClose = row"
            />
          </div>
        </template>
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-rectangle-group"
            :title="t('groups.list.emptyTitle')"
            :description="t('groups.list.emptyDescription')"
          >
            <template #action>
              <UButton icon="i-heroicons-plus" @click="showCreate = true">{{
                t('groups.list.newGroup')
              }}</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>
      <div v-if="groups && groups.totalElements > 0" class="pt-4">
        <DataPagination
          v-model:page="page"
          v-model:page-size="pageSize"
          :total="groups.totalElements"
        />
      </div>
    </UCard>

    <UModal v-model="showCreate">
      <UCard>
        <template #header>
          <span class="font-semibold">{{ t('groups.list.newGroup') }}</span>
        </template>
        <GroupForm
          :loading="creating"
          :submit-label="t('common.create')"
          cancelable
          @submit="onCreate"
          @cancel="showCreate = false"
        />
      </UCard>
    </UModal>

    <ConfirmModal
      :model-value="confirmClose !== null"
      :title="t('groups.list.closeConfirmTitle')"
      :description="t('groups.list.closeConfirmDescription')"
      :confirm-label="t('groups.list.actions.close')"
      color="orange"
      :loading="closing"
      @update:model-value="
        (v: boolean) => {
          if (!v) confirmClose = null
        }
      "
      @confirm="onClose"
    />
  </div>
</template>

<script setup lang="ts">
import type { GroupFilter, GroupRequest, GroupResponse, GroupStatus } from '~/features/groups/types'
import type { BranchResponse } from '~/features/branches/types'
import type { ColumnDef, PageResponse } from '~/shared/types'

const { t } = useI18n()
const api = useApi()
const toast = useToast()
const router = useRouter()

const page = ref(1)
const pageSize = ref(10)
const filters = reactive({
  search: '',
  status: '' as '' | GroupStatus,
  branchId: '' as '' | number
})

function buildQuery(): GroupFilter {
  return {
    page: page.value,
    size: pageSize.value,
    search: filters.search || undefined,
    status: filters.status || undefined,
    branchId: filters.branchId || undefined
  }
}

const {
  data: groups,
  pending,
  error: fetchError,
  refresh
} = await useAsyncData('groups', () =>
  api<PageResponse<GroupResponse>>('/groups', { query: buildQuery() })
)

const totalLabel = computed(() => {
  const count = groups.value?.totalElements ?? 0
  return count === 1 ? t('groups.list.totalOne') : t('groups.list.totalOther', { count })
})

watch(page, () => refresh())
watch(pageSize, () => {
  page.value = 1
  refresh()
})
watch(
  () => filters.status,
  () => {
    page.value = 1
    refresh()
  }
)
watch(
  () => filters.branchId,
  () => {
    page.value = 1
    refresh()
  }
)

// Debounced so we don't fire a request on every keystroke.
let searchTimer: ReturnType<typeof setTimeout>
watch(
  () => filters.search,
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
const branchFilterOptions = computed(() => [
  { label: t('groups.list.branchFilterAll'), value: '' },
  ...(branchesData.value ?? []).map((b) => ({ label: b.name, value: b.id }))
])

const statusFilterOptions = computed(() => [
  { label: t('groups.list.statusOptions.all'), value: '' },
  { label: t('common.active'), value: 'ACTIVE' },
  { label: t('common.inactive'), value: 'INACTIVE' },
  { label: t('common.status.CLOSED'), value: 'CLOSED' }
])

const columns = computed<ColumnDef<GroupResponse>[]>(() => [
  { key: 'name', label: t('groups.list.columns.name'), sortable: true },
  { key: 'code', label: t('groups.list.columns.code') },
  { key: 'branchName', label: t('groups.list.columns.branch') },
  { key: 'leaderName', label: t('groups.list.columns.leader') },
  { key: 'memberCount', label: t('groups.list.columns.members') },
  { key: 'status', label: t('groups.list.columns.status'), type: 'status' },
  { key: 'createdAt', label: t('groups.list.columns.created'), type: 'datetime' },
  { key: 'actions', label: '', class: 'text-right' }
])

function onSelect(row: GroupResponse) {
  router.push(`/groups/${row.id}`)
}

const showCreate = ref(false)
const creating = ref(false)

async function onCreate(payload: GroupRequest) {
  creating.value = true
  try {
    await api('/groups', { method: 'POST', body: payload })
    toast.add({ title: t('groups.list.toastCreated'), color: 'green' })
    showCreate.value = false
    page.value = 1
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    creating.value = false
  }
}

const actingId = ref<number | null>(null)
const action = ref<'status' | null>(null)

async function onToggleStatus(row: GroupResponse) {
  actingId.value = row.id
  action.value = 'status'
  const nextStatus = row.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
  try {
    await api(`/groups/${row.id}/status`, { method: 'PUT', body: { status: nextStatus } })
    toast.add({
      title:
        nextStatus === 'INACTIVE'
          ? t('groups.list.toast.deactivated', { name: row.name })
          : t('groups.list.toast.activated', { name: row.name }),
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

const closing = ref(false)
const confirmClose = ref<GroupResponse | null>(null)

async function onClose() {
  if (!confirmClose.value) return
  closing.value = true
  try {
    await api(`/groups/${confirmClose.value.id}/close`, { method: 'POST' })
    toast.add({
      title: t('groups.list.toast.closed', { name: confirmClose.value.name }),
      color: 'green'
    })
    confirmClose.value = null
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    closing.value = false
  }
}
</script>
