<template>
  <div class="flex flex-col h-full">
    <div
      class="h-16 shrink-0 flex items-center gap-2.5 px-5 border-b border-gray-200 dark:border-gray-800"
    >
      <NuxtLink to="/" class="flex items-center gap-2.5">
        <span
          class="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-fuchsia-400 to-pink-500 text-white shrink-0 shadow-sm"
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
          class="w-full flex items-center justify-between px-3 mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 hover:text-fuchsia-500 dark:hover:text-fuchsia-400"
          @click="toggle(i)"
        >
          <span class="flex items-center gap-1.5">
            <UIcon v-if="group.icon" :name="group.icon" class="w-3.5 h-3.5 shrink-0" />
            <span>{{ group.title }}</span>
          </span>
          <UIcon
            :name="isOpen(i) ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'"
            class="w-3.5 h-3.5 shrink-0"
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
            active:
              'text-fuchsia-600 dark:text-fuchsia-400 bg-fuchsia-50 dark:bg-fuchsia-400/10 before:hidden',
            inactive:
              'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800',
            icon: {
              base: 'w-5 h-5 shrink-0',
              active: 'text-fuchsia-600 dark:text-fuchsia-400',
              inactive: 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'
            }
          }"
        />
      </div>
    </div>
    <div class="shrink-0 border-t border-gray-200 dark:border-gray-800 px-4 py-3 space-y-3">
      <div class="flex items-center gap-2">
        <div
          class="flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-semibold uppercase shrink-0 shadow-sm"
          :class="avatarGradient(username)"
        >
          {{ username?.slice(0, 2) }}
        </div>
        <div class="min-w-0">
          <p class="text-sm font-medium text-gray-900 dark:text-white truncate leading-tight">
            {{ username }}
          </p>
          <UBadge v-if="role" :color="isAdmin ? 'pink' : 'gray'" variant="subtle" size="xs">{{
            role
          }}</UBadge>
        </div>
      </div>
      <div class="flex items-center justify-between">
        <ColorModeToggle />
        <div class="flex items-center gap-1">
          <UButton
            size="xs"
            color="gray"
            variant="ghost"
            icon="i-heroicons-key"
            @click="emit('change-password')"
          >
            Password
          </UButton>
          <UButton
            size="xs"
            color="gray"
            variant="ghost"
            icon="i-heroicons-arrow-right-on-rectangle"
            @click="emit('logout')"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  groups: {
    title?: string
    icon?: string
    links: { label: string; to: string; icon: string }[]
  }[]
  username?: string | null
  role?: string | null
  isAdmin?: boolean
}>()

const emit = defineEmits<{
  'change-password': []
  logout: []
}>()

// Each titled group (module) collapses independently. Until the user
// explicitly toggles one, it defaults open only if it contains the active
// route — keeps the sidebar compact while auto-expanding the current module.
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
