<template>
  <UPopover v-model:open="open" :popper="{ placement: 'bottom-start' }">
    <!-- Trigger styled like a UInput so it sits naturally inside UFormGroup -->
    <UButton
      color="white"
      variant="solid"
      icon="i-heroicons-calendar-days"
      class="w-full justify-start font-normal"
      :ui="{ rounded: 'rounded-lg' }"
    >
      <span :class="modelValue ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'">
        {{ modelValue ? formatDate(modelValue) : placeholder }}
      </span>
    </UButton>

    <template #panel>
      <div class="p-3 w-[17rem] select-none">
        <div class="flex items-center justify-between mb-2">
          <UButton icon="i-heroicons-chevron-left" color="gray" variant="ghost" size="xs" aria-label="Previous month" @click="shiftMonth(-1)" />
          <span class="text-sm font-semibold text-gray-900 dark:text-white">{{ monthLabel }}</span>
          <UButton icon="i-heroicons-chevron-right" color="gray" variant="ghost" size="xs" aria-label="Next month" @click="shiftMonth(1)" />
        </div>

        <div class="grid grid-cols-7 text-center mb-1">
          <span v-for="d in WEEKDAYS" :key="d" class="text-xs font-medium text-gray-400 dark:text-gray-500 py-1">{{ d }}</span>
        </div>

        <div class="grid grid-cols-7 gap-y-0.5">
          <span v-for="n in leadingBlanks" :key="`blank-${n}`" />
          <button
            v-for="day in days"
            :key="day.iso"
            type="button"
            class="h-8 w-8 mx-auto flex items-center justify-center rounded-full text-sm transition-colors"
            :class="dayClasses(day)"
            :disabled="day.disabled"
            @click="pick(day)"
          >
            {{ day.label }}
          </button>
        </div>

        <div class="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          <UButton size="xs" color="gray" variant="ghost" @click="pickToday">Today</UButton>
          <UButton v-if="clearable && modelValue" size="xs" color="gray" variant="ghost" @click="clear">Clear</UButton>
        </div>
      </div>
    </template>
  </UPopover>
</template>

<script setup lang="ts">
// Dependency-free date picker: UPopover + a plain calendar grid.
// v-model is an ISO `yyyy-MM-dd` string ('' when empty) so it drops into the
// existing DTOs (CustomerRequest.dateOfBirth, PaymentRequest.dueDate) without
// any Date-object/timezone conversion at the call sites.
const props = withDefaults(defineProps<{
  modelValue?: string
  placeholder?: string
  min?: string
  max?: string
  clearable?: boolean
}>(), {
  modelValue: '',
  placeholder: 'Select a date',
  clearable: true
})

const emit = defineEmits<{ 'update:modelValue': [string] }>()

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const open = ref(false)

// All date math is done on local calendar fields (never Date.toISOString(),
// which shifts across the UTC boundary for users east of Greenwich).
function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const todayIso = toIso(new Date())

// The month currently shown in the grid (always the 1st of that month).
const view = ref(startOfMonth(props.modelValue ? new Date(props.modelValue) : new Date()))

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

// Re-center the grid on the selected month each time the popover opens.
watch(open, (isOpen) => {
  if (isOpen) {
    view.value = startOfMonth(props.modelValue ? new Date(props.modelValue) : new Date())
  }
})

const monthLabel = computed(() =>
  view.value.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
)

const leadingBlanks = computed(() => view.value.getDay())

type Day = { label: number; iso: string; disabled: boolean }

const days = computed<Day[]>(() => {
  const year = view.value.getFullYear()
  const month = view.value.getMonth()
  const count = new Date(year, month + 1, 0).getDate()
  return Array.from({ length: count }, (_, i) => {
    const iso = toIso(new Date(year, month, i + 1))
    return {
      label: i + 1,
      iso,
      disabled: (!!props.min && iso < props.min) || (!!props.max && iso > props.max)
    }
  })
})

function dayClasses(day: Day): string {
  if (day.iso === props.modelValue) {
    return 'bg-primary-500 text-white font-semibold'
  }
  if (day.disabled) {
    return 'text-gray-300 dark:text-gray-700 cursor-not-allowed'
  }
  if (day.iso === todayIso) {
    return 'text-primary-600 dark:text-primary-400 font-semibold hover:bg-gray-100 dark:hover:bg-gray-800'
  }
  return 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
}

function shiftMonth(delta: number) {
  view.value = new Date(view.value.getFullYear(), view.value.getMonth() + delta, 1)
}

function pick(day: Day) {
  if (day.disabled) return
  emit('update:modelValue', day.iso)
  open.value = false
}

function pickToday() {
  if ((props.min && todayIso < props.min) || (props.max && todayIso > props.max)) return
  emit('update:modelValue', todayIso)
  open.value = false
}

function clear() {
  emit('update:modelValue', '')
  open.value = false
}
</script>
