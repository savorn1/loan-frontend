<template>
  <UCard>
    <template #header>
      <span class="font-semibold">Notes</span>
    </template>

    <UForm :state="form" class="flex items-start gap-2 mb-6" @submit="onCreate">
      <UTextarea
        v-model="form.note"
        :rows="2"
        placeholder="Add an internal note..."
        class="flex-1"
        required
      />
      <UButton type="submit" :loading="creating" :disabled="!form.note.trim()">Add</UButton>
    </UForm>

    <ol v-if="(notes ?? []).length" class="space-y-4">
      <li
        v-for="n in sortedNotes"
        :key="n.id"
        class="border-b border-gray-100 dark:border-gray-800 pb-3 last:border-0 last:pb-0"
      >
        <p class="text-sm whitespace-pre-wrap">{{ n.note }}</p>
        <p class="text-xs text-gray-500 mt-1">
          {{ n.authorName }} · {{ formatDateTime(n.createdAt) }}
        </p>
      </li>
    </ol>
    <EmptyState
      v-else
      icon="i-heroicons-chat-bubble-left-right"
      title="No notes yet"
      description="Internal notes and comments about this loan will appear here."
    />
  </UCard>
</template>

<script setup lang="ts">
import type { LoanNoteRequest, LoanNoteResponse } from '~/features/loans/types'

const route = useRoute()
const api = useApi()
const toast = useToast()

const loanId = route.params.id as string

const { data: notes, refresh } = await useAsyncData(`loan-${loanId}-notes`, () =>
  api<LoanNoteResponse[]>(`/loans/${loanId}/notes`)
)

const sortedNotes = computed(() =>
  [...(notes.value ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
)

const creating = ref(false)
const form = reactive({ note: '' })

async function onCreate() {
  if (!form.note.trim()) return
  creating.value = true
  try {
    const payload: LoanNoteRequest = { note: form.note.trim() }
    await api(`/loans/${loanId}/notes`, { method: 'POST', body: payload })
    form.note = ''
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    creating.value = false
  }
}
</script>
