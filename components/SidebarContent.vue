<template>
  <div class="flex flex-col h-full">
    <div
      class="h-16 shrink-0 flex items-center gap-2.5 px-5 border-b border-gray-200 dark:border-gray-800"
    >
      <NuxtLink to="/" class="flex items-center gap-2.5">
        <span
          class="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-teal-600 text-white shrink-0 shadow-sm"
        >
          <UIcon name="i-heroicons-banknotes" class="w-4.5 h-4.5" />
        </span>
        <span class="font-bold text-gray-900 dark:text-white tracking-tight">LMS</span>
      </NuxtLink>
    </div>
    <div class="flex-1 px-3 py-4 overflow-y-auto space-y-4">
      <div v-for="(group, i) in groups" :key="i">
        <button
          v-if="group.title"
          type="button"
          class="w-full flex items-center justify-between px-3 mb-1.5 text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 transition-colors"
          :class="accent(group.color).headerHover"
          @click="toggle(i)"
        >
          <span class="flex items-center gap-2">
            <UIcon
              v-if="group.icon"
              :name="group.icon"
              class="w-4 h-4 shrink-0"
              :class="accent(group.color).headerIcon"
            />
            <span>{{ group.title }}</span>
          </span>
          <UIcon
            :name="isOpen(i) ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'"
            class="w-4 h-4 shrink-0"
          />
        </button>
        <UVerticalNavigation
          v-show="!group.title || isOpen(i)"
          :links="group.links"
          :ui="{
            wrapper: 'space-y-0.5',
            base: 'group flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
            padding: 'px-0 py-0',
            rounded: 'rounded-xl',
            active: accent(group.color).active,
            inactive:
              'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800',
            icon: {
              base: 'w-5 h-5 shrink-0',
              active: accent(group.color).activeIcon,
              inactive:
                'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'
            }
          }"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  groups: {
    title?: string
    icon?: string
    color?: string
    links: { label: string; to: string; icon: string }[]
  }[]
}>()

// Per-module accent so each collapsible group (User Management, Payment,
// Accounting, Loan Configuration) reads as its own visual section instead of
// everything sharing the same primary green. Classes are spelled out in full
// (never `text-${color}-500`) so Tailwind's static scanner picks them up —
// it can't see runtime-interpolated class names.
const GROUP_ACCENTS: Record<
  string,
  { headerIcon: string; headerHover: string; active: string; activeIcon: string }
> = {
  pink: {
    headerIcon: 'text-pink-500 dark:text-pink-400',
    headerHover: 'hover:text-pink-600 dark:hover:text-pink-400',
    active: 'text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-400/10',
    activeIcon: 'text-pink-600 dark:text-pink-400'
  },
  blue: {
    headerIcon: 'text-blue-500 dark:text-blue-400',
    headerHover: 'hover:text-blue-600 dark:hover:text-blue-400',
    active: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-400/10',
    activeIcon: 'text-blue-600 dark:text-blue-400'
  },
  orange: {
    headerIcon: 'text-orange-500 dark:text-orange-400',
    headerHover: 'hover:text-orange-600 dark:hover:text-orange-400',
    active: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-400/10',
    activeIcon: 'text-orange-600 dark:text-orange-400'
  },
  indigo: {
    headerIcon: 'text-indigo-500 dark:text-indigo-400',
    headerHover: 'hover:text-indigo-600 dark:hover:text-indigo-400',
    active: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-400/10',
    activeIcon: 'text-indigo-600 dark:text-indigo-400'
  }
}

const DEFAULT_ACCENT = {
  headerIcon: 'text-gray-400 dark:text-gray-500',
  headerHover: 'hover:text-primary-500 dark:hover:text-primary-400',
  active: 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-400/10',
  activeIcon: 'text-primary-600 dark:text-primary-400'
}

function accent(color?: string) {
  return (color && GROUP_ACCENTS[color]) || DEFAULT_ACCENT
}

const route = useRoute()
const openOverrides = ref<Record<number, boolean>>({})

function groupIsActive(i: number) {
  const group = props.groups[i]
  return (
    group?.links.some((link) => route.path === link.to || route.path.startsWith(`${link.to}/`)) ??
    false
  )
}

function isOpen(i: number) {
  return openOverrides.value[i] ?? groupIsActive(i)
}

function toggle(i: number) {
  openOverrides.value[i] = !isOpen(i)
}
</script>
