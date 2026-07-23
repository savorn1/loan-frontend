<template>
  <UBadge :color="meta.color" variant="subtle" class="gap-1">
    <UIcon :name="meta.icon" class="w-3 h-3" />
    {{ status }}
  </UBadge>
</template>

<script setup lang="ts">
const props = defineProps<{ status: string }>()

// Maps loan/payment/penalty/settlement/transaction/document statuses to a
// badge color + icon. Covers LoanStatus, PaymentStatus, PenaltyStatus,
// SettlementStatus, TransactionStatus, LoanProductStatus and
// LoanDocumentStatus, which share several values (e.g. PENDING).
// Positive statuses are teal (not green) so they stay visually distinct from
// the emerald brand color used on buttons/links (see app.config.ts).
type StatusColor = 'teal' | 'red' | 'gray' | 'orange'

const STATUS_META: Record<string, { color: StatusColor; icon: string }> = {
  APPROVED: { color: 'teal', icon: 'i-heroicons-check-circle' },
  ACTIVE: { color: 'teal', icon: 'i-heroicons-bolt' },
  OPEN: { color: 'teal', icon: 'i-heroicons-lock-open' },
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
  PENDING: { color: 'orange', icon: 'i-heroicons-clock' }
}

const DEFAULT_META: { color: StatusColor; icon: string } = {
  color: 'orange',
  icon: 'i-heroicons-clock'
}

const meta = computed(() => STATUS_META[props.status] ?? DEFAULT_META)
</script>
