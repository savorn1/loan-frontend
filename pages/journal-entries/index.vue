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
            description="Record a journal entry to start tracking the general ledger."
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

    <UModal v-model="showCreate" :ui="{ width: 'sm:max-w-2xl' }">
      <UCard>
        <template #header>
          <span class="font-semibold">New Journal Entry</span>
        </template>

        <UForm :state="createForm" class="space-y-4" @submit="onCreate">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UFormGroup label="Transaction type" name="transactionType" required>
              <USelectMenu
                v-model="createForm.transactionType"
                :options="transactionTypeOptions"
                option-attribute="label"
                value-attribute="value"
              />
            </UFormGroup>
            <UFormGroup label="Transaction date" name="transactionDate" required>
              <DatePicker v-model="createForm.transactionDate" />
            </UFormGroup>
            <UFormGroup label="Currency" name="currency" required>
              <UInput v-model="createForm.currency" placeholder="e.g. USD" />
            </UFormGroup>
            <UFormGroup label="Reference" name="referenceId" hint="Opaque pointer back to the upstream event, e.g. a loan id">
              <UInput v-model="createForm.referenceId" placeholder="Reference ID" />
            </UFormGroup>
          </div>
          <UFormGroup label="Description" name="description">
            <UTextarea v-model="createForm.description" />
          </UFormGroup>

          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium">Lines</span>
              <UButton size="2xs" variant="soft" icon="i-heroicons-plus" @click="addLine">Add line</UButton>
            </div>
            <div class="space-y-2">
              <div v-for="(line, i) in createForm.lines" :key="i" class="flex items-center gap-2">
                <USelectMenu
                  v-model="line.glAccountId"
                  :options="glAccountOptions"
                  option-attribute="label"
                  value-attribute="value"
                  placeholder="Account"
                  class="flex-1"
                />
                <USelectMenu v-model="line.entrySide" :options="entrySideOptions" option-attribute="label" value-attribute="value" class="w-32" />
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
import type { GlAccountResponse, JournalEntryLineRequest, JournalEntryRequest, JournalEntryResponse, TransactionType } from '~/features/accounting/types'
import type { ColumnDef } from '~/shared/types'

const api = useApi()
const toast = useToast()
const router = useRouter()

const { data: entries, pending, refresh } = await useAsyncData('journal-entries', () => api<JournalEntryResponse[]>('/journal-entries'))
const { data: glAccounts } = await useAsyncData('journal-entries-gl-accounts', () => api<GlAccountResponse[]>('/gl-accounts'))

const glAccountOptions = computed(() => (glAccounts.value ?? []).map(a => ({ label: `${a.accountNo} — ${a.accountName}`, value: a.id })))

const columns: ColumnDef<JournalEntryResponse>[] = [
  { key: 'entryNo', label: 'Entry no.', sortable: true },
  { key: 'transactionType', label: 'Type', type: 'enum', sortable: true },
  { key: 'transactionDate', label: 'Date', type: 'date', sortable: true },
  { key: 'financialPeriodName', label: 'Period' },
  { key: 'referenceId', label: 'Reference' },
  { key: 'status', type: 'status', sortable: true },
  { key: 'createdAt', label: 'Created', type: 'datetime', sortable: true }
]

const { page, pageSize, sort, total, rows } = useClientTable(entries, { pageSize: 10 })

const totalLabel = computed(() => {
  const count = entries.value?.length ?? 0
  return count === 1 ? '1 journal entry' : `${count} journal entries`
})

const transactionTypeOptions = [
  { label: 'Disbursement', value: 'DISBURSEMENT' },
  { label: 'Principal payment', value: 'PRINCIPAL_PAYMENT' },
  { label: 'Interest payment', value: 'INTEREST_PAYMENT' },
  { label: 'Fee charge', value: 'FEE_CHARGE' },
  { label: 'Penalty charge', value: 'PENALTY_CHARGE' },
  { label: 'Loan write-off', value: 'LOAN_WRITE_OFF' },
  { label: 'Payment reversal', value: 'PAYMENT_REVERSAL' }
]
const entrySideOptions = [
  { label: 'Debit', value: 'DEBIT' },
  { label: 'Credit', value: 'CREDIT' }
]

const showCreate = ref(false)
const creating = ref(false)
const error = ref('')

interface LineFormValue extends Partial<JournalEntryLineRequest> {
  glAccountId?: number
  entrySide: 'DEBIT' | 'CREDIT'
  amount: number
}

function emptyLine(): LineFormValue {
  return { glAccountId: undefined, entrySide: 'DEBIT', amount: 0 }
}

const createForm = reactive<{
  transactionType: TransactionType | undefined
  transactionDate: string
  currency: string
  referenceId: string
  description: string
  lines: LineFormValue[]
}>({
  transactionType: undefined,
  transactionDate: '',
  currency: '',
  referenceId: '',
  description: '',
  lines: [emptyLine(), { ...emptyLine(), entrySide: 'CREDIT' }]
})

const totalDebit = computed(() => createForm.lines.filter(l => l.entrySide === 'DEBIT').reduce((sum, l) => sum + (Number(l.amount) || 0), 0))
const totalCredit = computed(() => createForm.lines.filter(l => l.entrySide === 'CREDIT').reduce((sum, l) => sum + (Number(l.amount) || 0), 0))
const isBalanced = computed(() => createForm.lines.length >= 2 && totalDebit.value > 0 && totalDebit.value === totalCredit.value)

function addLine() {
  createForm.lines.push(emptyLine())
}

function removeLine(index: number) {
  createForm.lines.splice(index, 1)
}

function openCreate() {
  createForm.transactionType = undefined
  createForm.transactionDate = ''
  createForm.currency = ''
  createForm.referenceId = ''
  createForm.description = ''
  createForm.lines = [emptyLine(), { ...emptyLine(), entrySide: 'CREDIT' }]
  error.value = ''
  showCreate.value = true
}

async function onCreate() {
  if (!createForm.transactionType || !createForm.transactionDate || !createForm.currency) {
    error.value = 'Please fill in the transaction type, date and currency.'
    return
  }
  creating.value = true
  error.value = ''
  try {
    const payload: JournalEntryRequest = {
      transactionType: createForm.transactionType,
      transactionDate: createForm.transactionDate,
      currency: createForm.currency,
      referenceId: createForm.referenceId || undefined,
      description: createForm.description || undefined,
      lines: createForm.lines.map((l, i) => ({
        lineNo: i + 1,
        glAccountId: l.glAccountId!,
        entrySide: l.entrySide,
        amount: Number(l.amount)
      }))
    }
    const created = await api<JournalEntryResponse>('/journal-entries', { method: 'POST', body: payload })
    toast.add({ title: 'Journal entry created as draft', color: 'green' })
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
