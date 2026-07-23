<template>
  <div>
    <PageHeader title="Journal Entries" :description="totalLabel">
      <template #actions>
        <UButton icon="i-heroicons-plus" @click="openCreate">New Journal Entry</UButton>
      </template>
    </PageHeader>

    <UCard>
      <DataTable
        :rows="rows"
        :columns="columns"
        :loading="pending"
        v-model:sort="sort"
        @select="(row: JournalEntryResponse) => router.push(`/journal-entries/${row.id}`)"
      >
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-book-open"
            title="No journal entries yet"
            description="Record a journal entry to start tracking the accounting ledger."
          >
            <template #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">New Journal Entry</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>

    <UModal v-model="showCreate">
      <UCard>
        <template #header>
          <span class="font-semibold">New Journal Entry</span>
        </template>

        <UForm :state="createForm" class="space-y-4" @submit="onCreate">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UFormGroup label="Entry date" name="entryDate" required>
              <DatePicker v-model="createForm.entryDate" />
            </UFormGroup>
            <UFormGroup label="Reference" name="reference">
              <UInput v-model="createForm.reference" />
            </UFormGroup>
          </div>
          <UFormGroup label="Description" name="description" required>
            <UTextarea v-model="createForm.description" required />
          </UFormGroup>

          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium">Lines</span>
              <UButton size="2xs" variant="soft" icon="i-heroicons-plus" @click="addLine">Add line</UButton>
            </div>
            <div class="space-y-2">
              <div v-for="(line, i) in createForm.lines" :key="i" class="flex items-center gap-2">
                <UInput v-model="line.account" placeholder="Account" class="flex-1" />
                <USelectMenu v-model="line.type" :options="lineTypeOptions" option-attribute="label" value-attribute="value" class="w-32" />
                <UInput v-model.number="line.amount" type="number" min="0.01" step="0.01" placeholder="Amount" class="w-32" />
                <UButton size="2xs" color="red" variant="ghost" icon="i-heroicons-x-mark" :disabled="createForm.lines.length <= 2" @click="removeLine(i)" />
              </div>
            </div>
            <p class="text-xs mt-2" :class="isBalanced ? 'text-gray-500' : 'text-red-500'">
              Debits {{ formatCurrency(totalDebit) }} · Credits {{ formatCurrency(totalCredit) }}
              <span v-if="!isBalanced">— must balance before saving</span>
            </p>
          </div>

          <UAlert v-if="error" color="red" variant="subtle" :title="error" />

          <div class="flex justify-end gap-2 pt-2">
            <UButton color="gray" variant="ghost" @click="showCreate = false">Cancel</UButton>
            <UButton type="submit" :loading="creating" :disabled="!isBalanced">Create</UButton>
          </div>
        </UForm>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { JournalEntryLineRequest, JournalEntryRequest, JournalEntryResponse } from '~/features/accounting/types'
import type { ColumnDef } from '~/shared/types'

const api = useApi()
const toast = useToast()
const router = useRouter()

const { data: entries, pending, refresh } = await useAsyncData('journal-entries', () => api<JournalEntryResponse[]>('/accounting/journal-entries'))

const columns: ColumnDef<JournalEntryResponse>[] = [
  { key: 'id', label: 'ID', sortable: true },
  { key: 'entryDate', label: 'Date', type: 'date', sortable: true },
  { key: 'description' },
  { key: 'reference' },
  { key: 'totalDebit', label: 'Debit', type: 'currency', sortable: true },
  { key: 'totalCredit', label: 'Credit', type: 'currency', sortable: true },
  { key: 'createdAt', label: 'Created', type: 'datetime', sortable: true }
]

const { page, pageSize, sort, total, rows } = useClientTable(entries, { pageSize: 10 })

const totalLabel = computed(() => {
  const count = entries.value?.length ?? 0
  return count === 1 ? '1 journal entry' : `${count} journal entries`
})

const lineTypeOptions = [
  { label: 'Debit', value: 'DEBIT' },
  { label: 'Credit', value: 'CREDIT' }
]

const showCreate = ref(false)
const creating = ref(false)
const error = ref('')

function emptyLine(): JournalEntryLineRequest {
  return { account: '', type: 'DEBIT', amount: 0 }
}

const createForm = reactive<{ entryDate: string; description: string; reference: string; lines: JournalEntryLineRequest[] }>({
  entryDate: '',
  description: '',
  reference: '',
  lines: [emptyLine(), { account: '', type: 'CREDIT', amount: 0 }]
})

const totalDebit = computed(() => createForm.lines.filter(l => l.type === 'DEBIT').reduce((sum, l) => sum + (Number(l.amount) || 0), 0))
const totalCredit = computed(() => createForm.lines.filter(l => l.type === 'CREDIT').reduce((sum, l) => sum + (Number(l.amount) || 0), 0))
const isBalanced = computed(() => createForm.lines.length >= 2 && totalDebit.value > 0 && totalDebit.value === totalCredit.value)

function addLine() {
  createForm.lines.push(emptyLine())
}

function removeLine(index: number) {
  createForm.lines.splice(index, 1)
}

function openCreate() {
  createForm.entryDate = ''
  createForm.description = ''
  createForm.reference = ''
  createForm.lines = [emptyLine(), { account: '', type: 'CREDIT', amount: 0 }]
  error.value = ''
  showCreate.value = true
}

async function onCreate() {
  if (!createForm.entryDate || !createForm.description) {
    error.value = 'Please fill in the entry date and description.'
    return
  }
  creating.value = true
  error.value = ''
  try {
    const payload: JournalEntryRequest = {
      entryDate: createForm.entryDate,
      description: createForm.description,
      reference: createForm.reference || undefined,
      lines: createForm.lines
    }
    const created = await api<JournalEntryResponse>('/accounting/journal-entries', { method: 'POST', body: payload })
    toast.add({ title: 'Journal entry created', color: 'green' })
    showCreate.value = false
    await refresh()
    await router.push(`/journal-entries/${created.id}`)
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    creating.value = false
  }
}
</script>
