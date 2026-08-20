<template>
  <UButton variant="link" icon="i-heroicons-arrow-left" size="xs" class="mb-1 px-0" @click="goBack">
    {{ t('admin.reports.backToReports') }}
  </UButton>
</template>

<script setup lang="ts">
// Every report page links back to /reports with this button. Using router.back()
// instead of a plain `to="/reports"` link matters because Nuxt only restores the
// reports index's scroll position on an actual back/popstate navigation, not on a
// fresh push — so a plain link always dropped the user back at the top of the
// (now very long) reports index. Falls back to a push for direct/deep-linked
// visits that have no in-app history to go back to.
const { t } = useI18n()
const router = useRouter()

function goBack() {
  if (window.history.state?.back) {
    router.back()
  } else {
    router.push('/reports')
  }
}
</script>
