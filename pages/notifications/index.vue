<template>
  <div>
    <PageHeader :title="t('admin.notifications.title')" :description="totalLabel" />

    <UCard class="mb-4">
      <div class="flex flex-wrap items-end gap-4">
        <UFormGroup :label="t('admin.notifications.recipientTypeLabel')" class="w-full sm:w-40">
          <USelectMenu
            v-model="filters.recipientType"
            :options="recipientTypeOptions"
            option-attribute="label"
            value-attribute="value"
          />
        </UFormGroup>
        <UFormGroup :label="t('admin.notifications.channelLabel')" class="w-full sm:w-40">
          <USelectMenu
            v-model="filters.channel"
            :options="channelOptions"
            option-attribute="label"
            value-attribute="value"
          />
        </UFormGroup>
        <UFormGroup :label="t('admin.notifications.statusLabel')" class="w-full sm:w-40">
          <USelectMenu
            v-model="filters.status"
            :options="statusOptions"
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
      <UAlert
        v-else-if="isTruncated"
        color="amber"
        variant="subtle"
        class="mb-4"
        :title="t('admin.notifications.truncatedNotice', { count: notifications.length })"
      />

      <DataTable v-model:sort="sort" :rows="rows" :columns="columns" :loading="pending">
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-bell"
            :title="t('admin.notifications.empty.title')"
            :description="t('admin.notifications.empty.description')"
          />
        </template>
      </DataTable>
      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type {
  NotificationChannel,
  NotificationFilter,
  NotificationResponse,
  NotificationStatus,
  RecipientType
} from '~/features/notifications/types'
import type { CustomerResponse } from '~/features/customers/types'
import type { UserResponse } from '~/features/users/types'
import type { ColumnDef, PageResponse } from '~/shared/types'

const { t } = useI18n()
const api = useApi()

// Matches the `size` in buildQuery below — this endpoint has no recipientId
// filter (see useNotificationBell.ts), so a hit list this large means older
// notifications outside the window are silently absent rather than paginated to.
const FETCH_SIZE = 200

const filters = reactive({
  recipientType: '' as '' | RecipientType,
  channel: '' as '' | NotificationChannel,
  status: '' as '' | NotificationStatus
})

const recipientTypeOptions = computed(() => [
  { label: t('admin.notifications.recipientTypeOptions.all'), value: '' },
  { label: t('admin.notifications.recipientTypeOptions.customer'), value: 'CUSTOMER' },
  { label: t('admin.notifications.recipientTypeOptions.user'), value: 'USER' }
])
const channelOptions = computed(() => [
  { label: t('admin.notifications.channelOptions.all'), value: '' },
  { label: t('admin.notifications.channelOptions.email'), value: 'EMAIL' },
  { label: t('admin.notifications.channelOptions.sms'), value: 'SMS' },
  { label: t('admin.notifications.channelOptions.push'), value: 'PUSH' },
  { label: t('admin.notifications.channelOptions.inApp'), value: 'IN_APP' }
])
const statusOptions = computed(() => [
  { label: t('admin.notifications.statusOptions.all'), value: '' },
  { label: t('admin.notifications.statusOptions.pending'), value: 'PENDING' },
  { label: t('admin.notifications.statusOptions.sent'), value: 'SENT' },
  { label: t('admin.notifications.statusOptions.failed'), value: 'FAILED' }
])

function buildQuery(): NotificationFilter {
  return {
    recipientType: filters.recipientType || undefined,
    channel: filters.channel || undefined,
    status: filters.status || undefined,
    page: 1,
    size: FETCH_SIZE
  }
}

const {
  data: notificationsRaw,
  pending,
  error: fetchError,
  refresh
} = await useAsyncData('notifications', () =>
  api<PageResponse<NotificationResponse>>('/notifications', { query: buildQuery() })
)

const notifications = computed(() => notificationsRaw.value?.content ?? [])
const isTruncated = computed(() => notifications.value.length >= FETCH_SIZE)

const { page, pageSize, sort, total, rows } = useClientTable(notifications, { pageSize: 10 })

// Recipient names, resolved lazily per row shown (rather than for all `notifications`,
// which can hold up to FETCH_SIZE entries) since /notifications only returns a numeric
// recipientId. Maps are reactive (Vue proxies Map/Set), so a column reading them
// re-renders once a lookup resolves — same pattern as applications/index.vue's
// branchNameById. A failed lookup (e.g. a deleted customer) just leaves the id showing.
const customerNameById = ref(new Map<number, string>())
const userNameById = ref(new Map<number, string>())

watch(
  rows,
  async (visible) => {
    const customerIds = [
      ...new Set(
        visible
          .filter(
            (n) => n.recipientType === 'CUSTOMER' && !customerNameById.value.has(n.recipientId)
          )
          .map((n) => n.recipientId)
      )
    ]
    const userIds = [
      ...new Set(
        visible
          .filter((n) => n.recipientType === 'USER' && !userNameById.value.has(n.recipientId))
          .map((n) => n.recipientId)
      )
    ]
    await Promise.allSettled([
      // No batch-by-ids endpoint on customer-service, so these stay one request per id.
      ...customerIds.map(async (id) => {
        const customer = await api<CustomerResponse>(`/customers/${id}`)
        customerNameById.value.set(id, customer.fullName)
      }),
      (async () => {
        if (!userIds.length) return
        const users = await api<UserResponse[]>('/auth/users/by-ids', { query: { ids: userIds } })
        for (const u of users) userNameById.value.set(u.id, u.username)
      })()
    ])
  },
  { immediate: true }
)

function recipientLabel(n: NotificationResponse) {
  const name =
    n.recipientType === 'CUSTOMER'
      ? customerNameById.value.get(n.recipientId)
      : userNameById.value.get(n.recipientId)
  return name ? `${name} (#${n.recipientId})` : String(n.recipientId)
}

const totalLabel = computed(() => {
  const count = notifications.value?.length ?? 0
  return count === 1
    ? t('admin.notifications.total.one')
    : t('admin.notifications.total.other', { count })
})

watch(
  () => [filters.recipientType, filters.channel, filters.status],
  () => refresh()
)

const columns = computed<ColumnDef<NotificationResponse>[]>(() => [
  { key: 'recipientType', label: t('admin.notifications.columns.recipient'), type: 'enum' },
  {
    key: 'recipientId',
    label: t('admin.notifications.columns.recipientId'),
    value: recipientLabel
  },
  { key: 'channel', label: t('admin.notifications.columns.channel'), type: 'enum' },
  { key: 'subject', label: t('admin.notifications.columns.subject') },
  {
    key: 'message',
    label: t('admin.notifications.columns.message'),
    value: (row) => (row.message.length > 60 ? `${row.message.slice(0, 60)}…` : row.message)
  },
  { key: 'status', label: t('admin.notifications.columns.status'), type: 'status' },
  { key: 'sentAt', label: t('admin.notifications.columns.sent'), type: 'datetime' },
  { key: 'createdAt', label: t('admin.notifications.columns.created'), type: 'datetime' }
])
</script>
