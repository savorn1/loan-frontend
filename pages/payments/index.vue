<template>
  <div>
    <PageHeader :title="t('payments.list.title')" :description="totalLabel">
      <template #actions>
        <UButtonGroup size="sm">
          <UButton
            :color="view === 'list' ? 'primary' : 'gray'"
            :variant="view === 'list' ? 'solid' : 'soft'"
            icon="i-heroicons-list-bullet"
            @click="view = 'list'"
          >
            {{ t('payments.list.calendar.listView') }}
          </UButton>
          <UButton
            :color="view === 'calendar' ? 'primary' : 'gray'"
            :variant="view === 'calendar' ? 'solid' : 'soft'"
            icon="i-heroicons-calendar-days"
            @click="view = 'calendar'"
          >
            {{ t('payments.list.calendar.calendarView') }}
          </UButton>
        </UButtonGroup>
        <UButton icon="i-heroicons-plus" @click="openCreate">{{
          t('payments.list.newPayment')
        }}</UButton>
      </template>
    </PageHeader>

    <UCard class="mb-6">
      <div class="flex flex-wrap items-center gap-3">
        <USelectMenu
          v-model="filterLoan"
          :options="loanOptions"
          option-attribute="label"
          searchable
          :placeholder="t('payments.list.filterByLoanPlaceholder')"
          class="w-full sm:w-72"
        />
        <USelectMenu
          v-model="statusFilter"
          :options="statusOptions"
          option-attribute="label"
          value-attribute="value"
          class="w-40"
        />
        <DateRangeFilter v-model:from="dateFrom" v-model:to="dateTo" />
        <UButton
          v-if="filterLoan || statusFilter || dateFrom || dateTo"
          variant="ghost"
          color="gray"
          icon="i-heroicons-x-mark"
          @click="clearFilters"
        >
          {{ t('common.clearFilters') }}
        </UButton>
      </div>
    </UCard>

    <UCard>
      <UAlert
        v-if="fetchError"
        color="red"
        variant="subtle"
        class="mb-4"
        :title="apiErrorMessage(fetchError)"
      />

      <PaymentCalendar
        v-if="view === 'calendar'"
        :payments="filteredByStatus"
        :loan-label="loanLabel"
        :marking-paid-id="markingPaid"
        @mark-paid="onMarkPaid"
      />

      <template v-else>
        <DataTable
          v-model:sort="sort"
          :rows="rows"
          :columns="columns"
          :loading="pending"
          numbered
          :row-number-start="(page - 1) * pageSize"
        >
          <template #actions-data="{ row }">
            <div class="flex gap-1 justify-end">
              <UButton
                v-if="row.status !== 'PAID'"
                size="2xs"
                variant="soft"
                :loading="markingPaid === row.id"
                @click="onMarkPaid(row.id)"
              >
                {{ t('payments.list.markPaid') }}
              </UButton>
              <UButton
                v-if="isAdmin"
                size="2xs"
                color="red"
                variant="soft"
                icon="i-heroicons-trash"
                :aria-label="t('common.delete')"
                @click="confirmDeleteId = row.id"
              />
            </div>
          </template>
          <template #empty-state>
            <EmptyState
              :icon="hasFilters ? 'i-heroicons-magnifying-glass' : 'i-heroicons-credit-card'"
              :title="hasFilters ? t('common.noMatches') : t('payments.list.emptyTitle')"
              :description="
                hasFilters
                  ? t('payments.list.emptySearchDescription')
                  : t('payments.list.emptyDescription')
              "
            >
              <template v-if="!hasFilters" #action>
                <UButton icon="i-heroicons-plus" @click="openCreate">{{
                  t('payments.list.newPayment')
                }}</UButton>
              </template>
            </EmptyState>
          </template>
        </DataTable>

        <div v-if="total > 0" class="pt-4">
          <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
        </div>
      </template>
    </UCard>

    <UModal v-model="showCreate">
      <UCard>
        <template #header>
          <span class="font-semibold">{{ t('payments.list.newPayment') }}</span>
        </template>
        <DynamicForm
          v-model="createForm"
          :fields="paymentFields"
          :loading="creating"
          :error="error"
          :submit-label="t('common.create')"
          cancelable
          @submit="onCreate"
          @cancel="showCreate = false"
        />
      </UCard>
    </UModal>

    <ConfirmModal
      :model-value="confirmDeleteId !== null"
      :title="t('payments.list.deleteConfirmTitle')"
      :description="t('payments.list.deleteConfirmDescription')"
      :confirm-label="t('common.delete')"
      color="red"
      :loading="deleting"
      @update:model-value="
        (v: boolean) => {
          if (!v) confirmDeleteId = null
        }
      "
      @confirm="onDelete"
    />
  </div>
</template>

<script setup lang="ts">
import type { LoanResponse } from '~/features/loans/types'
import type { PaymentRequest, PaymentResponse, PaymentStatus } from '~/features/payments/types'
import type { ColumnDef, FieldDef, PageResponse } from '~/shared/types'

const api = useApi()
const toast = useToast()
const { t } = useI18n()
const { isAdmin } = storeToRefs(useAuth())

type LoanOption = { label: string; value: number }

const filterLoan = ref<LoanOption | undefined>(undefined)

const {
  data: payments,
  pending,
  error: fetchError,
  refresh
} = await useAsyncData(
  'payments',
  async () => {
    // /payments/loan/{id} already returns a bare list (unpaginated by design);
    // /payments itself paginates, so fetch a large page and take its content —
    // this page aggregates/filters across the whole result set client-side.
    if (filterLoan.value) {
      return api<PaymentResponse[]>(`/payments/loan/${filterLoan.value.value}`)
    }
    const page = await api<PageResponse<PaymentResponse>>('/payments', { query: { size: 1000 } })
    return page.content
  },
  { watch: [filterLoan] }
)
const { data: loansRaw } = await useAsyncData('payments-loans', () =>
  api<PageResponse<LoanResponse>>('/loans', { query: { size: 1000 } })
)

const loanOptions = computed<LoanOption[]>(() =>
  (loansRaw.value?.content ?? []).map((l) => ({
    label: `${l.loanNo || `#${l.id}`} — ${l.customerName} (${l.status})`,
    value: l.id
  }))
)

const loanNoById = computed(
  () => new Map((loansRaw.value?.content ?? []).map((l) => [l.id, l.loanNo]))
)

const view = ref<'list' | 'calendar'>('list')

function loanLabel(loanId: number): string {
  return loanNoById.value.get(loanId) || `#${loanId}`
}

const statusOptions = computed<{ label: string; value: PaymentStatus | '' }[]>(() => [
  { label: t('payments.list.statusOptions.all'), value: '' },
  { label: t('payments.list.statusOptions.pending'), value: 'PENDING' },
  { label: t('payments.list.statusOptions.paid'), value: 'PAID' },
  { label: t('payments.list.statusOptions.overdue'), value: 'OVERDUE' }
])
const statusFilter = ref<PaymentStatus | ''>('')
const { from: dateFrom, to: dateTo, inRange } = useDateRangeFilter()

const filteredByStatus = computed(() =>
  (payments.value ?? [])
    .filter((p) => !statusFilter.value || p.status === statusFilter.value)
    .filter((p) => inRange(p.createdAt))
)

const { page, pageSize, sort, total, rows } = useClientTable(filteredByStatus, { pageSize: 10 })

const hasFilters = computed(
  () => !!filterLoan.value || !!statusFilter.value || !!dateFrom.value || !!dateTo.value
)

const totalLabel = computed(() => {
  const count = payments.value?.length ?? 0
  return count === 1
    ? t('payments.list.totalLabelOne')
    : t('payments.list.totalLabelOther', { count })
})

function clearFilters() {
  filterLoan.value = undefined
  statusFilter.value = ''
  dateFrom.value = ''
  dateTo.value = ''
}

const columns = computed<ColumnDef<PaymentResponse>[]>(() => [
  {
    key: 'loanId',
    label: t('payments.list.columns.loan'),
    type: 'link',
    sortable: true,
    href: (row) => `/loans/${row.loanId}`,
    value: (row) => loanNoById.value.get(row.loanId) || `#${row.loanId}`
  },
  {
    key: 'installmentNumber',
    label: t('payments.list.columns.installmentNumber'),
    sortable: true
  },
  { key: 'amount', label: t('payments.list.columns.amount'), type: 'currency', sortable: true },
  { key: 'dueDate', label: t('payments.list.columns.due'), type: 'date', sortable: true },
  { key: 'status', label: t('payments.list.columns.status'), type: 'status', sortable: true },
  {
    key: 'createdAt',
    label: t('payments.list.columns.created'),
    type: 'datetime',
    sortable: true
  },
  { key: 'actions', label: '', class: 'text-right' }
])

const showCreate = ref(false)
const creating = ref(false)
const error = ref('')
const markingPaid = ref<number | null>(null)
const deleting = ref(false)
const confirmDeleteId = ref<number | null>(null)

// Declarative field defs for <DynamicForm> — required/select/date validation
// is handled there (these controls have no native browser validation).
const paymentFields = computed<FieldDef[]>(() => [
  {
    name: 'loanId',
    label: t('payments.list.fields.loan'),
    type: 'select',
    required: true,
    options: loanOptions.value,
    placeholder: t('payments.list.fields.loanPlaceholder')
  },
  { name: 'amount', label: t('payments.list.fields.amount'), type: 'currency', required: true },
  {
    name: 'dueDate',
    label: t('payments.list.fields.dueDate'),
    type: 'date',
    required: true,
    placeholder: t('payments.list.fields.dueDatePlaceholder')
  },
  { name: 'note', label: t('payments.list.fields.note'), type: 'text' }
])

const createForm = ref<Record<string, any>>({})

function openCreate() {
  createForm.value = { loanId: undefined, amount: undefined, dueDate: '', note: '' }
  error.value = ''
  showCreate.value = true
}

async function onCreate(values: Record<string, any>) {
  creating.value = true
  error.value = ''
  try {
    const payload: PaymentRequest = {
      loanId: values.loanId,
      amount: values.amount,
      dueDate: values.dueDate,
      note: values.note || undefined
    }
    await api('/payments', { method: 'POST', body: payload })
    toast.add({ title: t('payments.list.created'), color: 'green' })
    showCreate.value = false
    await refresh()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    creating.value = false
  }
}

async function onMarkPaid(id: number) {
  markingPaid.value = id
  try {
    await api(`/payments/${id}/pay`, { method: 'PUT' })
    toast.add({ title: t('payments.list.markedPaid'), color: 'green' })
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    markingPaid.value = null
  }
}

async function onDelete() {
  if (confirmDeleteId.value === null) return
  deleting.value = true
  try {
    await api(`/payments/${confirmDeleteId.value}`, { method: 'DELETE' })
    toast.add({ title: 'Payment deleted', color: 'green' })
    confirmDeleteId.value = null
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    deleting.value = false
  }
}
</script>
