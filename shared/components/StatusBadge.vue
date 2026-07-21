<template>
  <UBadge :color="color" variant="subtle" class="gap-1">
    <UIcon :name="icon" class="w-3 h-3" />
    {{ status }}
  </UBadge>
</template>

<script setup lang="ts">
const props = defineProps<{ status: string }>()

// Maps loan/payment statuses to a badge color + icon. Covers both LoanStatus
// (PENDING/APPROVED/REJECTED/ACTIVE/CLOSED) and PaymentStatus
// (PENDING/PAID/OVERDUE) since they share the PENDING value.
// Positive statuses are teal (not green) so they stay visually distinct from
// the emerald brand color used on buttons/links (see app.config.ts).
const color = computed(() => {
  switch (props.status) {
    case 'APPROVED':
    case 'ACTIVE':
    case 'PAID':
      return 'teal'
    case 'REJECTED':
    case 'OVERDUE':
      return 'red'
    case 'CLOSED':
      return 'gray'
    case 'PENDING':
    default:
      return 'orange'
  }
})

const icon = computed(() => {
  switch (props.status) {
    case 'APPROVED':
      return 'i-heroicons-check-circle'
    case 'ACTIVE':
      return 'i-heroicons-bolt'
    case 'PAID':
      return 'i-heroicons-check-badge'
    case 'REJECTED':
      return 'i-heroicons-x-circle'
    case 'OVERDUE':
      return 'i-heroicons-exclamation-triangle'
    case 'CLOSED':
      return 'i-heroicons-lock-closed'
    case 'PENDING':
    default:
      return 'i-heroicons-clock'
  }
})
</script>
