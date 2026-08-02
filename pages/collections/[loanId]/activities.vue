<template>
  <UCard>
    <template #header>
      <span class="font-semibold">{{ t('collections.activities.title') }}</span>
    </template>

    <DynamicForm
      v-model="form"
      :fields="fields"
      :loading="creating"
      :error="error"
      :submit-label="t('collections.activities.submit')"
      @submit="onCreate"
    />

    <UAlert
      v-if="fetchError"
      color="red"
      variant="subtle"
      class="mb-4"
      :title="apiErrorMessage(fetchError)"
    />

    <ol v-if="(activities ?? []).length" class="space-y-4 mt-6">
      <li
        v-for="a in activities"
        :key="a.id"
        class="border-b border-gray-100 dark:border-gray-800 pb-3 last:border-0 last:pb-0"
      >
        <div class="flex items-center justify-between gap-2 text-sm">
          <span class="font-medium text-gray-900 dark:text-white">
            {{ formatEnum(a.contactMethod) }} — {{ formatEnum(a.outcome) }}
          </span>
          <span class="text-xs text-gray-400 dark:text-gray-500 shrink-0">{{
            formatDateTime(a.createdAt)
          }}</span>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-0.5 whitespace-pre-wrap">{{ a.note }}</p>
        <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          {{ a.authorName }}<template v-if="a.followUpDate"> · Follow up {{ formatDate(a.followUpDate) }}</template>
        </p>
      </li>
    </ol>
    <EmptyState
      v-else
      icon="i-heroicons-chat-bubble-left-right"
      :title="t('collections.activities.empty.title')"
      :description="t('collections.activities.empty.description')"
    />
  </UCard>
</template>

<script setup lang="ts">
import type { CollectionActivityRequest, CollectionActivityResponse } from '~/features/collections/types'
import type { FieldDef } from '~/shared/types'

const route = useRoute()
const api = useApi()
const toast = useToast()
const { t } = useI18n()

const loanId = route.params.loanId as string

const {
  data: activities,
  error: fetchError,
  refresh
} = await useAsyncData(`collection-case-${loanId}-activities`, () =>
  api<CollectionActivityResponse[]>(`/payments/collections/${loanId}/activities`)
)

const fields = computed<FieldDef[]>(() => [
  {
    name: 'contactMethod',
    label: t('collections.activities.fields.contactMethod'),
    type: 'select',
    required: true,
    wrapper: 'half',
    options: [
      { label: t('collections.shared.contactMethods.phone'), value: 'PHONE' },
      { label: t('collections.shared.contactMethods.email'), value: 'EMAIL' },
      { label: t('collections.shared.contactMethods.sms'), value: 'SMS' },
      { label: t('collections.shared.contactMethods.visit'), value: 'VISIT' },
      { label: t('collections.shared.contactMethods.other'), value: 'OTHER' }
    ]
  },
  {
    name: 'outcome',
    label: t('collections.activities.fields.outcome'),
    type: 'select',
    required: true,
    wrapper: 'half',
    options: [
      { label: t('collections.shared.outcomes.noAnswer'), value: 'NO_ANSWER' },
      { label: t('collections.shared.outcomes.promiseToPay'), value: 'PROMISE_TO_PAY' },
      { label: t('collections.shared.outcomes.disputed'), value: 'DISPUTED' },
      { label: t('collections.shared.outcomes.paid'), value: 'PAID' },
      { label: t('collections.shared.outcomes.leftMessage'), value: 'LEFT_MESSAGE' },
      { label: t('collections.shared.outcomes.other'), value: 'OTHER' }
    ]
  },
  { name: 'note', label: t('collections.shared.note'), type: 'textarea', required: true, rows: 3 },
  { name: 'followUpDate', label: t('collections.activities.fields.nextFollowUp'), type: 'date' }
])

const creating = ref(false)
const error = ref('')
const form = ref<Record<string, any>>({
  contactMethod: undefined,
  outcome: undefined,
  note: '',
  followUpDate: ''
})

function resetForm() {
  form.value = { contactMethod: undefined, outcome: undefined, note: '', followUpDate: '' }
}

async function onCreate(values: Record<string, any>) {
  creating.value = true
  error.value = ''
  try {
    const payload: CollectionActivityRequest = {
      contactMethod: values.contactMethod,
      outcome: values.outcome,
      note: values.note,
      followUpDate: values.followUpDate || undefined
    }
    await api(`/payments/collections/${loanId}/activities`, { method: 'POST', body: payload })
    toast.add({ title: t('collections.activities.success'), color: 'green' })
    resetForm()
    await refresh()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    creating.value = false
  }
}
</script>
