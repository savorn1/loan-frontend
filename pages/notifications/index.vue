<template>
  <div>
    <PageHeader :title="t('admin.notifications.title')" :description="totalLabel" />

    <UCard class="mb-4">
      <div class="flex flex-wrap items-end gap-4">
        <UFormGroup :label="t('admin.notifications.recipientTypeLabel')" class="w-40">
          <USelectMenu
            v-model="filters.recipientType"
            :options="recipientTypeOptions"
            option-attribute="label"
            value-attribute="value"
          />
        </UFormGroup>
        <UFormGroup :label="t('admin.notifications.channelLabel')" class="w-40">
          <USelectMenu
            v-model="filters.channel"
            :options="channelOptions"
            option-attribute="label"
            value-attribute="value"
          />
        </UFormGroup>
        <UFormGroup :label="t('admin.notifications.statusLabel')" class="w-40">
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
import type { ColumnDef, PageResponse } from '~/shared/types'

const { t } = useI18n()
const api = useApi()

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
    size: 200
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

const { page, pageSize, sort, total, rows } = useClientTable(notifications, { pageSize: 10 })

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
  { key: 'recipientId', label: t('admin.notifications.columns.recipientId') },
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
