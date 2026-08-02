<template>
  <div class="flex flex-col h-full">
    <div
      class="h-16 shrink-0 flex items-center gap-2.5 border-b border-gray-200 dark:border-gray-800"
      :class="collapsed ? 'justify-center px-0' : 'px-5'"
    >
      <NuxtLink to="/" class="flex items-center gap-2.5">
        <span
          class="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-teal-600 text-white shrink-0 shadow-sm"
        >
          <UIcon name="i-heroicons-banknotes" class="w-4.5 h-4.5" />
        </span>
        <span v-if="!collapsed" class="font-bold text-gray-900 dark:text-white tracking-tight"
          >LMS</span
        >
      </NuxtLink>
    </div>

    <div v-if="!collapsed" class="flex-1 px-3 py-4 overflow-y-auto space-y-4">
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

    <!-- Collapsed: flat icon-only rail, grouping dropped, label shown as a hover tooltip. -->
    <div v-else class="flex-1 px-2 py-4 overflow-y-auto space-y-1">
      <UTooltip
        v-for="link in flatLinks"
        :key="link.to"
        :text="link.label"
        :popper="{ placement: 'right' }"
      >
        <NuxtLink
          :to="link.to"
          class="w-10 h-10 mx-auto flex items-center justify-center rounded-xl transition-colors"
          :class="
            linkIsActive(link)
              ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-400/10'
              : 'text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
          "
        >
          <UIcon :name="link.icon" class="w-5 h-5 shrink-0" />
        </NuxtLink>
      </UTooltip>
    </div>

    <button
      type="button"
      class="h-12 shrink-0 flex items-center justify-center border-t border-gray-200 dark:border-gray-800 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
      :aria-label="collapsed ? t('common.expandSidebar') : t('common.collapseSidebar')"
      @click="collapsed = !collapsed"
    >
      <UIcon
        :name="collapsed ? 'i-heroicons-chevron-double-right' : 'i-heroicons-chevron-double-left'"
        class="w-4.5 h-4.5"
      />
    </button>
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

const collapsed = defineModel<boolean>('collapsed', { default: false })

const { t } = useI18n()

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

const flatLinks = computed(() => props.groups.flatMap((g) => g.links))

function linkIsActive(link: { to: string }) {
  return route.path === link.to || route.path.startsWith(`${link.to}/`)
}
</script>
