<template>
  <div>
    <UButton to="/reports" variant="link" icon="i-heroicons-arrow-left" size="xs" class="mb-1 px-0">
      {{ t('admin.reports.backToReports') }}
    </UButton>
    <PageHeader
      :title="t('accounting.generalLedgerReports.journalEntryDetails.title')"
      :description="t('accounting.generalLedgerReports.journalEntryDetails.description')"
      :crumbs="[
        { label: t('admin.reports.title'), to: '/reports' },
        { label: t('admin.reports.generalLedgerReportsHeader') },
        { label: t('accounting.generalLedgerReports.journalEntryDetails.title') }
      ]"
    />

    <UCard>
      <form class="flex flex-wrap items-end gap-3" @submit.prevent="onSearch">
        <UFormGroup
          :label="t('accounting.generalLedgerReports.journalEntryDetails.searchLabel')"
          class="w-full sm:w-64"
        >
          <UInput
            v-model="entryNo"
            :placeholder="
              t('accounting.generalLedgerReports.journalEntryDetails.searchPlaceholder')
            "
          />
        </UFormGroup>
        <UButton type="submit" :loading="searching">
          {{ t('accounting.generalLedgerReports.journalEntryDetails.searchButton') }}
        </UButton>
      </form>
      <UAlert
        v-if="notFound"
        color="red"
        variant="subtle"
        class="mt-4"
        :title="t('accounting.generalLedgerReports.journalEntryDetails.notFound')"
      />
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { JournalEntryResponse } from '~/features/accounting/types'

const { t } = useI18n()
const api = useApi()
const router = useRouter()

const entryNo = ref('')
const searching = ref(false)
const notFound = ref(false)

async function onSearch() {
  const query = entryNo.value.trim()
  if (!query) return
  searching.value = true
  notFound.value = false
  try {
    const entries = await api<JournalEntryResponse[]>('/journal-entries')
    const match = entries.find((e) => e.entryNo?.toLowerCase() === query.toLowerCase())
    if (match) {
      await router.push(`/journal-entries/${match.id}`)
    } else {
      notFound.value = true
    }
  } finally {
    searching.value = false
  }
}
</script>
