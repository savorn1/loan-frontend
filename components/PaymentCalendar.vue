<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <UButton
          icon="i-heroicons-chevron-left"
          color="gray"
          variant="ghost"
          size="sm"
          :aria-label="t('datePicker.previousMonth')"
          @click="shiftMonth(-1)"
        />
        <span class="text-sm font-semibold text-gray-900 dark:text-white min-w-[9rem] text-center">
          {{ monthLabel }}
        </span>
        <UButton
          icon="i-heroicons-chevron-right"
          color="gray"
          variant="ghost"
          size="sm"
          :aria-label="t('datePicker.nextMonth')"
          @click="shiftMonth(1)"
        />
      </div>
      <UButton size="xs" color="gray" variant="soft" @click="goToday">{{
        t('datePicker.today')
      }}</UButton>
    </div>

    <div class="grid grid-cols-7 text-center pb-2">
      <span
        v-for="d in weekdays"
        :key="d"
        class="text-xs font-medium text-gray-400 dark:text-gray-500"
        >{{ d }}</span
      >
    </div>

    <div
      class="grid grid-cols-7 gap-px bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-800"
    >
      <div
        v-for="cell in days"
        :key="cell.iso"
        class="min-h-[6.5rem] bg-white dark:bg-gray-900 p-1.5 flex flex-col gap-1"
        :class="!cell.inMonth && 'bg-gray-50/60 dark:bg-gray-950/40'"
      >
        <span
          class="text-xs font-medium h-5 w-5 flex items-center justify-center rounded-full shrink-0"
          :class="
            cell.isToday
              ? 'bg-primary-500 text-white'
              : cell.inMonth
                ? 'text-gray-700 dark:text-gray-300'
                : 'text-gray-300 dark:text-gray-600'
          "
        >
          {{ cell.day }}
        </span>

        <div v-if="cell.payments.length" class="flex flex-col gap-0.5">
          <UPopover
            v-for="p in cell.payments.slice(0, 2)"
            :key="p.id"
            :popper="{ placement: 'right-start' }"
          >
            <button
              type="button"
              class="w-full text-left text-[11px] leading-tight px-1 py-0.5 rounded truncate transition-colors"
              :class="pillClass(p.status)"
            >
              {{ formatCurrency(p.amount) }}
            </button>

            <template #panel>
              <div class="p-3 w-56 text-sm">
                <div class="flex items-center justify-between gap-2 mb-2">
                  <NuxtLink
                    :to="`/loans/${p.loanId}`"
                    class="font-medium text-primary-600 dark:text-primary-400 hover:underline truncate"
                  >
                    {{ loanLabel(p.loanId) }}
                  </NuxtLink>
                  <StatusBadge :status="p.status" />
                </div>
                <dl class="space-y-1 text-gray-500 dark:text-gray-400">
                  <div class="flex justify-between gap-2">
                    <dt>{{ t('payments.list.columns.installmentNumber') }}</dt>
                    <dd class="text-gray-900 dark:text-white">{{ p.installmentNumber ?? '—' }}</dd>
                  </div>
                  <div class="flex justify-between gap-2">
                    <dt>{{ t('payments.list.columns.amount') }}</dt>
                    <dd class="text-gray-900 dark:text-white">{{ formatCurrency(p.amount) }}</dd>
                  </div>
                  <div class="flex justify-between gap-2">
                    <dt>{{ t('payments.list.columns.due') }}</dt>
                    <dd class="text-gray-900 dark:text-white">{{ formatDate(p.dueDate) }}</dd>
                  </div>
                </dl>
                <UButton
                  v-if="p.status !== 'PAID'"
                  block
                  size="xs"
                  class="mt-3"
                  :loading="markingPaidId === p.id"
                  @click="emit('mark-paid', p.id)"
                >
                  {{ t('payments.list.markPaid') }}
                </UButton>
              </div>
            </template>
          </UPopover>

          <span
            v-if="cell.payments.length > 2"
            class="text-[11px] text-gray-400 dark:text-gray-500 px-1"
          >
            {{ t('payments.list.calendar.more', { count: cell.payments.length - 2 }) }}
          </span>
        </div>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-4 mt-4 text-xs text-gray-500 dark:text-gray-400">
      <span class="flex items-center gap-1.5">
        <span class="h-2.5 w-2.5 rounded-full bg-orange-400" />
        {{ t('payments.list.statusOptions.pending') }}
      </span>
      <span class="flex items-center gap-1.5">
        <span class="h-2.5 w-2.5 rounded-full bg-teal-500" />
        {{ t('payments.list.statusOptions.paid') }}
      </span>
      <span class="flex items-center gap-1.5">
        <span class="h-2.5 w-2.5 rounded-full bg-red-500" />
        {{ t('payments.list.statusOptions.overdue') }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PaymentResponse, PaymentStatus } from '~/features/payments/types'

const props = defineProps<{
  payments: PaymentResponse[]
  loanLabel: (loanId: number) => string
  markingPaidId?: number | null
}>()

const emit = defineEmits<{ 'mark-paid': [number] }>()

const { t, locale } = useI18n()

const weekdays = computed(() => [
  t('datePicker.weekdaySu'),
  t('datePicker.weekdayMo'),
  t('datePicker.weekdayTu'),
  t('datePicker.weekdayWe'),
  t('datePicker.weekdayTh'),
  t('datePicker.weekdayFr'),
  t('datePicker.weekdaySa')
])

// All date math is done on local calendar fields (never Date.toISOString(),
// which shifts across the UTC boundary for users east of Greenwich) — same
// approach as <DatePicker>, so a payment's dueDate lines up with the same
// calendar cell regardless of viewer timezone.
function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

const todayIso = toIso(new Date())
const view = ref(startOfMonth(new Date()))

const monthLabel = computed(() =>
  view.value.toLocaleDateString(locale.value === 'km' ? 'km-KH' : 'en-US', {
    month: 'long',
    year: 'numeric'
  })
)

function shiftMonth(delta: number) {
  view.value = new Date(view.value.getFullYear(), view.value.getMonth() + delta, 1)
}

function goToday() {
  view.value = startOfMonth(new Date())
}

const paymentsByDate = computed(() => {
  const map = new Map<string, PaymentResponse[]>()
  for (const p of props.payments) {
    const list = map.get(p.dueDate) ?? []
    list.push(p)
    map.set(p.dueDate, list)
  }
  return map
})

type CalendarDay = {
  iso: string
  day: number
  inMonth: boolean
  isToday: boolean
  payments: PaymentResponse[]
}

function buildCell(d: Date, inMonth: boolean): CalendarDay {
  const iso = toIso(d)
  return {
    iso,
    day: d.getDate(),
    inMonth,
    isToday: iso === todayIso,
    payments: paymentsByDate.value.get(iso) ?? []
  }
}

const days = computed<CalendarDay[]>(() => {
  const year = view.value.getFullYear()
  const month = view.value.getMonth()
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: CalendarDay[] = []

  for (let i = 0; i < firstWeekday; i++) {
    cells.push(buildCell(new Date(year, month, i - firstWeekday + 1), false))
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(buildCell(new Date(year, month, d), true))
  }
  const totalCells = Math.ceil(cells.length / 7) * 7
  let trailing = 1
  while (cells.length < totalCells) {
    cells.push(buildCell(new Date(year, month + 1, trailing), false))
    trailing++
  }
  return cells
})

function pillClass(status: PaymentStatus): string {
  switch (status) {
    case 'PAID':
      return 'bg-teal-50 text-teal-700 dark:bg-teal-400/10 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-400/20'
    case 'OVERDUE':
      return 'bg-red-50 text-red-700 dark:bg-red-400/10 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-400/20'
    default:
      return 'bg-orange-50 text-orange-700 dark:bg-orange-400/10 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-400/20'
  }
}
</script>
