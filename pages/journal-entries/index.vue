<template>
  <div>
    <PageHeader :title="t('accounting.journalEntries.title')" :description="totalLabel">
      <template #actions>
        <UButton icon="i-heroicons-plus" @click="openCreate">{{
          t('accounting.journalEntries.newJournalEntry')
        }}</UButton>
      </template>
    </PageHeader>

    <UCard>
      <DataTable
        v-model:sort="sort"
        :rows="rows"
        :columns="columns"
        :loading="pending"
        @select="(row: JournalEntryResponse) => router.push(`/journal-entries/${row.id}`)"
      >
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-book-open"
            :title="t('accounting.journalEntries.emptyTitle')"
            :description="t('accounting.journalEntries.emptyDescription')"
          >
            <template #action>
              <UButton icon="i-heroicons-plus" @click="openCreate">{{
                t('accounting.journalEntries.newJournalEntry')
              }}</UButton>
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
          <span class="font-semibold">{{ t('accounting.journalEntries.newJournalEntry') }}</span>
        </template>

        <UForm :state="createForm" class="space-y-4" @submit="onCreate">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UFormGroup :label="t('accounting.journalEntries.fields.transactionType')" name="transactionType" required>
              <USelectMenu
                v-model="createForm.transactionType"
                :options="transactionTypeOptions"
                option-attribute="label"
                value-attribute="value"
              />
            </UFormGroup>
            <UFormGroup :label="t('accounting.journalEntries.fields.transactionDate')" name="transactionDate" required>
              <DatePicker v-model="createForm.transactionDate" />
            </UFormGroup>
            <UFormGroup :label="t('accounting.journalEntries.fields.currency')" name="currency" required>
              <UInput
                v-model="createForm.currency"
                :placeholder="t('accounting.journalEntries.fields.currencyPlaceholder')"
              />
            </UFormGroup>
            <UFormGroup
              :label="t('accounting.journalEntries.fields.reference')"
              name="referenceId"
              :help="t('accounting.journalEntries.fields.referenceHint')"
            >
              <UInput
                v-model="createForm.referenceId"
                :placeholder="t('accounting.journalEntries.fields.referencePlaceholder')"
              />
            </UFormGroup>
          </div>
          <UFormGroup :label="t('accounting.journalEntries.fields.description')" name="description">
            <UTextarea v-model="createForm.description" />
          </UFormGroup>

          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium">{{ t('accounting.journalEntries.fields.lines') }}</span>
              <UButton size="2xs" variant="soft" icon="i-heroicons-plus" @click="addLine"
                >{{ t('accounting.journalEntries.fields.addLine') }}</UButton
              >
            </div>
            <div class="space-y-2">
              <div v-for="(line, i) in createForm.lines" :key="i" class="flex items-center gap-2">
                <USelectMenu
                  v-model="line.glAccountId"
                  :options="glAccountOptions"
                  option-attribute="label"
                  value-attribute="value"
                  :placeholder="t('accounting.journalEntries.fields.account')"
                  class="flex-1"
                />
                <USelectMenu
                  v-model="line.entrySide"
                  :options="entrySideOptions"
                  option-attribute="label"
                  value-attribute="value"
                  class="w-32"
                />
                <UInput
                  v-model.number="line.amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  :placeholder="t('accounting.journalEntries.fields.amount')"
                  class="w-32"
                />
                <UButton
                  size="2xs"
                  color="red"
                  variant="ghost"
                  icon="i-heroicons-x-mark"
                  :disabled="createForm.lines.length <= 2"
                  @click="removeLine(i)"
                />
              </div>
            </div>
            <p class="text-xs mt-2" :class="isBalanced ? 'text-gray-500' : 'text-red-500'">
              {{
                t('accounting.journalEntries.fields.debitsCredits', {
                  debit: formatCurrency(totalDebit),
                  credit: formatCurrency(totalCredit)
                })
              }}
              <span v-if="!isBalanced">{{ t('accounting.journalEntries.fields.mustBalance') }}</span>
            </p>
          </div>

          <UAlert v-if="error" color="red" variant="subtle" :title="error" />

          <div class="flex justify-end gap-2 pt-2">
            <UButton color="gray" variant="ghost" @click="showCreate = false">{{ t('common.cancel') }}</UButton>
            <UButton type="submit" :loading="creating" :disabled="!isBalanced">{{ t('common.create') }}</UButton>
          </div>
        </UForm>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type {
  GlAccountResponse,
  JournalEntryLineRequest,
  JournalEntryRequest,
  JournalEntryResponse,
  TransactionType
} from '~/features/accounting/types'
import type { ColumnDef } from '~/shared/types'

const { t } = useI18n()
const api = useApi()
const toast = useToast()
const router = useRouter()

const {
  data: entries,
  pending,
  refresh
} = await useAsyncData('journal-entries', () => api<JournalEntryResponse[]>('/journal-entries'))
const { data: glAccounts } = await useAsyncData('journal-entries-gl-accounts', () =>
  api<GlAccountResponse[]>('/gl-accounts')
)

const glAccountOptions = computed(() =>
  (glAccounts.value ?? []).map((a) => ({ label: `${a.accountNo} — ${a.accountName}`, value: a.id }))
)

const columns = computed<ColumnDef<JournalEntryResponse>[]>(() => [
  { key: 'entryNo', label: t('accounting.journalEntries.columns.entryNo'), sortable: true },
  { key: 'transactionType', label: t('accounting.journalEntries.columns.type'), type: 'enum', sortable: true },
  { key: 'transactionDate', label: t('accounting.journalEntries.columns.date'), type: 'date', sortable: true },
  { key: 'financialPeriodName', label: t('accounting.journalEntries.columns.period') },
  { key: 'referenceId', label: t('accounting.journalEntries.columns.reference') },
  { key: 'status', label: t('accounting.journalEntries.columns.status'), type: 'status', sortable: true },
  { key: 'createdAt', label: t('accounting.journalEntries.columns.created'), type: 'datetime', sortable: true }
])

const { page, pageSize, sort, total, rows } = useClientTable(entries, { pageSize: 10 })

const totalLabel = computed(() => {
  const count = entries.value?.length ?? 0
  return count === 1
    ? t('accounting.journalEntries.totalLabelOne')
    : t('accounting.journalEntries.totalLabelOther', { count })
})

const transactionTypeOptions = computed(() => [
  { label: t('accounting.transactionTypes.disbursement'), value: 'DISBURSEMENT' },
  { label: t('accounting.transactionTypes.principalPayment'), value: 'PRINCIPAL_PAYMENT' },
  { label: t('accounting.transactionTypes.interestPayment'), value: 'INTEREST_PAYMENT' },
  { label: t('accounting.transactionTypes.feeCharge'), value: 'FEE_CHARGE' },
  { label: t('accounting.transactionTypes.penaltyCharge'), value: 'PENALTY_CHARGE' },
  { label: t('accounting.transactionTypes.loanWriteOff'), value: 'LOAN_WRITE_OFF' },
  { label: t('accounting.transactionTypes.paymentReversal'), value: 'PAYMENT_REVERSAL' }
])
const entrySideOptions = computed(() => [
  { label: t('accounting.entrySides.debit'), value: 'DEBIT' },
  { label: t('accounting.entrySides.credit'), value: 'CREDIT' }
])

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

const totalDebit = computed(() =>
  createForm.lines
    .filter((l) => l.entrySide === 'DEBIT')
    .reduce((sum, l) => sum + (Number(l.amount) || 0), 0)
)
const totalCredit = computed(() =>
  createForm.lines
    .filter((l) => l.entrySide === 'CREDIT')
    .reduce((sum, l) => sum + (Number(l.amount) || 0), 0)
)
const isBalanced = computed(
  () =>
    createForm.lines.length >= 2 && totalDebit.value > 0 && totalDebit.value === totalCredit.value
)

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
    error.value = t('accounting.journalEntries.validationMissingFields')
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
    const created = await api<JournalEntryResponse>('/journal-entries', {
      method: 'POST',
      body: payload
    })
    toast.add({ title: t('accounting.journalEntries.entryCreated'), color: 'green' })
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
