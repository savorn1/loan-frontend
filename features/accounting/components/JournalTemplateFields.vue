<template>
  <div class="space-y-4">
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <UFormGroup :label="t('accounting.journalTemplates.fields.code')" name="code" required>
        <UInput v-model="model.code" />
      </UFormGroup>
      <UFormGroup :label="t('accounting.journalTemplates.fields.name')" name="name" required>
        <UInput v-model="model.name" />
      </UFormGroup>
      <UFormGroup
        :label="t('accounting.journalTemplates.fields.transactionType')"
        name="transactionType"
        required
      >
        <USelectMenu
          v-model="model.transactionType"
          :options="transactionTypeOptions"
          option-attribute="label"
          value-attribute="value"
        />
      </UFormGroup>
      <UFormGroup :label="t('accounting.journalTemplates.fields.status')" name="status" required>
        <USelectMenu
          v-model="model.status"
          :options="statusOptions"
          option-attribute="label"
          value-attribute="value"
        />
      </UFormGroup>
    </div>

    <UFormGroup :label="t('accounting.journalTemplates.fields.description')" name="description">
      <UTextarea v-model="model.description" />
    </UFormGroup>

    <div>
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium">{{ t('accounting.journalTemplates.fields.lines') }}</span>
        <UButton size="2xs" variant="soft" icon="i-heroicons-plus" @click="addLine">{{
          t('accounting.journalTemplates.fields.addLine')
        }}</UButton>
      </div>
      <div class="space-y-2">
        <div v-for="(line, i) in model.lines" :key="i" class="flex items-center gap-2">
          <UInput
            v-model="line.accountRole"
            :placeholder="t('accounting.journalTemplates.fields.accountRolePlaceholder')"
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
            v-model="line.description"
            :placeholder="t('accounting.journalTemplates.fields.lineDescriptionPlaceholder')"
            class="flex-1"
          />
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
      <p class="text-xs mt-2 text-gray-500">
        {{ t('accounting.journalTemplates.fields.rolesHint') }}
      </p>
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

const { t } = useI18n()
const model = defineModel<JournalTemplateFormValue>({ required: true })

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
const statusOptions = computed(() => [
  { label: t('common.active'), value: 'ACTIVE' },
  { label: t('common.inactive'), value: 'INACTIVE' }
])

function addLine() {
  model.value.lines.push({
    lineNo: model.value.lines.length + 1,
    accountRole: '',
    entrySide: 'DEBIT',
    description: ''
  })
}

function removeLine(index: number) {
  model.value.lines.splice(index, 1)
}
</script>
