import type { NotificationResponse } from '~/features/notifications/types'
import type { PageResponse } from '~/shared/types'

// Powers the AppBar bell: IN_APP notifications addressed to the signed-in user (as
// opposed to the /notifications page, which is an audit log of every outbound
// notification to any customer or user). /notifications has no recipientId filter,
// so this fetches a bounded recent page and filters client-side — the same tradeoff
// pages/notifications/index.vue already makes with size: 200.
//
// There's no "read" flag on NotificationResponse, so "unread" is approximated as
// "created after the last time the bell was opened", persisted per-browser.
export function useNotificationBell() {
  const api = useApi()
  const { userId } = storeToRefs(useAuth())

  const lastSeen = useCookie<string>('notifications_last_seen', {
    default: () => new Date(0).toISOString(),
    sameSite: 'lax'
  })

  // Not gated on userId being loaded yet — the query itself doesn't depend on it
  // (recipientId filtering happens client-side below, once the cookie populates
  // from the profile fetch in layouts/default.vue's own onMounted).
  const { data, pending, error, refresh } = useAsyncData(
    'notification-bell',
    () =>
      api<PageResponse<NotificationResponse>>('/notifications', {
        query: { recipientType: 'USER', channel: 'IN_APP', status: 'SENT', page: 1, size: 50 }
      }),
    { server: false }
  )

  const items = computed(() =>
    (data.value?.content ?? [])
      .filter((n) => n.recipientId === userId.value)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  )

  const unreadCount = computed(() => items.value.filter((n) => n.createdAt > lastSeen.value).length)

  function markSeen() {
    lastSeen.value = new Date().toISOString()
  }

  let poll: ReturnType<typeof setInterval> | undefined
  onMounted(() => {
    poll = setInterval(() => refresh(), 60_000)
  })
  onUnmounted(() => clearInterval(poll))

  return { items, unreadCount, pending, error, markSeen, refresh }
}
