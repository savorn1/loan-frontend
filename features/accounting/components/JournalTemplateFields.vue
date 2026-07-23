<template>
  <div class="space-y-4">
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <UFormGroup label="Code" name="code" required>
        <UInput v-model="model.code" />
      </UFormGroup>
      <UFormGroup label="Name" name="name" required>
        <UInput v-model="model.name" />
      </UFormGroup>
      <UFormGroup label="Transaction type" name="transactionType" required>
        <USelectMenu
          v-model="model.transactionType"
          :options="transactionTypeOptions"
          option-attribute="label"
          value-attribute="value"
        />
      </UFormGroup>
      <UFormGroup label="Status" name="status" required>
        <USelectMenu
          v-model="model.status"
          :options="statusOptions"
          option-attribute="label"
          value-attribute="value"
        />
      </UFormGroup>
    </div>

    <UFormGroup label="Description" name="description">
      <UTextarea v-model="model.description" />
    </UFormGroup>

    <div>
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium">Lines</span>
        <UButton size="2xs" variant="soft" icon="i-heroicons-plus" @click="addLine">Add line</UButton>
      </div>
      <div class="space-y-2">
        <div v-for="(line, i) in model.lines" :key="i" class="flex items-center gap-2">
          <UInput v-model="line.accountRole" placeholder="Account role (e.g. CASH)" class="flex-1" />
          <USelectMenu
            v-model="line.entrySide"
            :options="entrySideOptions"
            option-attribute="label"
            value-attribute="value"
            class="w-32"
          />
          <UInput v-model="line.description" placeholder="Description" class="flex-1" />
          <UButton
            size="2xs"
            color="red"
            variant="ghost"
            icon="i-heroicons-x-mark"
            :disabled="model.lines.length <= 2"
            @click="removeLine(i)"
          />
        </div>
      </div>
      <p class="text-xs mt-2 text-gray-500">Roles are symbolic (e.g. CASH, LOAN_RECEIVABLE) — an accounting scheme binds each one to a real GL account per currency.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
// The code/name/transactionType/description/status fields plus the add/remove-able
// lines editor, shared by the create and edit modals on the journal templates page.
import type { JournalTemplateLineRequest, TransactionType } from '~/features/accounting/types'

interface JournalTemplateFormValue {
  code: string
  name: string
  transactionType: TransactionType | undefined
  description: string
  status: 'ACTIVE' | 'INACTIVE'
  lines: JournalTemplateLineRequest[]
}

const model = defineModel<JournalTemplateFormValue>({ required: true })

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
const statusOptions = [
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Inactive', value: 'INACTIVE' }
]

function addLine() {
  model.value.lines.push({ lineNo: model.value.lines.length + 1, accountRole: '', entrySide: 'DEBIT', description: '' })
}

function removeLine(index: number) {
  model.value.lines.splice(index, 1)
}
</script>
