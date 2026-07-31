<template>
  <UBadge :color="meta.color" variant="subtle" class="gap-1">
    <UIcon :name="meta.icon" class="w-3 h-3" />
    {{ status }}
  </UBadge>
</template>

<script setup lang="ts">
const props = defineProps<{ status: string }>()
type StatusColor = 'teal' | 'red' | 'gray' | 'orange'

const STATUS_META: Record<string, { color: StatusColor; icon: string }> = {
  APPROVED: { color: 'teal', icon: 'i-heroicons-check-circle' },
  ACTIVE: { color: 'teal', icon: 'i-heroicons-bolt' },
  OPEN: { color: 'teal', icon: 'i-heroicons-lock-open' },
  IN_PROGRESS: { color: 'orange', icon: 'i-heroicons-arrow-path' },
  RESOLVED: { color: 'teal', icon: 'i-heroicons-check-circle' },
  SENT: { color: 'teal', icon: 'i-heroicons-paper-airplane' },
  PUBLISHED: { color: 'teal', icon: 'i-heroicons-check-circle' },
  POSTED: { color: 'teal', icon: 'i-heroicons-check-circle' },
  DRAFT: { color: 'gray', icon: 'i-heroicons-pencil' },
  PAID: { color: 'teal', icon: 'i-heroicons-check-badge' },
  SUCCESS: { color: 'teal', icon: 'i-heroicons-check-badge' },
  VERIFIED: { color: 'teal', icon: 'i-heroicons-check-badge' },
  COMPLETED: { color: 'teal', icon: 'i-heroicons-flag' },
  PLEDGED: { color: 'teal', icon: 'i-heroicons-lock-closed' },
  RELEASED: { color: 'gray', icon: 'i-heroicons-lock-open' },
  REJECTED: { color: 'red', icon: 'i-heroicons-x-circle' },
  FAILED: { color: 'red', icon: 'i-heroicons-x-circle' },
  REVOKED: { color: 'red', icon: 'i-heroicons-x-circle' },
  EXPIRED: { color: 'red', icon: 'i-heroicons-exclamation-triangle' },
  REVERSED: { color: 'red', icon: 'i-heroicons-arrow-uturn-left' },
  OVERDUE: { color: 'red', icon: 'i-heroicons-exclamation-triangle' },
  CLOSED: { color: 'gray', icon: 'i-heroicons-lock-closed' },
  SUPERSEDED: { color: 'gray', icon: 'i-heroicons-archive-box' },
  PARTIALLY_PAID: { color: 'orange', icon: 'i-heroicons-adjustments-horizontal' },
  WAIVED: { color: 'gray', icon: 'i-heroicons-hand-raised' },
  REFUNDED: { color: 'gray', icon: 'i-heroicons-arrow-uturn-left' },
  INACTIVE: { color: 'gray', icon: 'i-heroicons-pause-circle' },
  SUBMITTED: { color: 'gray', icon: 'i-heroicons-paper-airplane' },
  UNDER_REVIEW: { color: 'orange', icon: 'i-heroicons-magnifying-glass' },
  WITHDRAWN: { color: 'gray', icon: 'i-heroicons-arrow-uturn-left' },
  PENDING: { color: 'orange', icon: 'i-heroicons-clock' },
  KEPT: { color: 'teal', icon: 'i-heroicons-check-circle' },
  BROKEN: { color: 'red', icon: 'i-heroicons-x-circle' },
  PARTIAL: { color: 'orange', icon: 'i-heroicons-adjustments-horizontal' },
  DELIVERED: { color: 'teal', icon: 'i-heroicons-check-badge' }
}

const DEFAULT_META: { color: StatusColor; icon: string } = {
  color: 'orange',
  icon: 'i-heroicons-clock'
}

const meta = computed(() => STATUS_META[props.status] ?? DEFAULT_META)
</script>
