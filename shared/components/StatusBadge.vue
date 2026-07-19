<template>
  <UBadge :color="color" variant="subtle">{{ status }}</UBadge>
</template>

<script setup lang="ts">
const props = defineProps<{ status: string }>()

// Maps loan/payment statuses to a badge color. Covers both LoanStatus
// (PENDING/APPROVED/REJECTED/ACTIVE/CLOSED) and PaymentStatus
// (PENDING/PAID/OVERDUE) since they share the PENDING value.
const color = computed(() => {
  switch (props.status) {
    case 'APPROVED':
    case 'ACTIVE':
    case 'PAID':
      return 'green'
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
</script>
