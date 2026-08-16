<template>
  <header
    class="h-16 shrink-0 flex items-center gap-3 px-4 sm:px-6 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-20"
  >
    <UButton
      icon="i-heroicons-bars-3"
      color="gray"
      variant="ghost"
      square
      class="lg:hidden"
      :aria-label="t('common.openMenu')"
      @click="emit('open-menu')"
    />
    <NuxtLink to="/" class="flex items-center gap-2 lg:hidden">
      <span
        class="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-teal-600 text-white shrink-0 shadow-sm"
      >
        <UIcon name="i-heroicons-banknotes" class="w-4 h-4" />
      </span>
      <span class="font-bold text-gray-900 dark:text-white tracking-tight">LMS</span>
    </NuxtLink>

    <div class="flex-1" />

    <div class="flex items-center gap-1.5 sm:gap-2">
      <UButton
        icon="i-heroicons-magnifying-glass"
        color="gray"
        variant="ghost"
        square
        :aria-label="t('commandPalette.open')"
        @click="emit('open-search')"
      />
      <ClientOnly>
        <ColorModeToggle />
        <template #fallback>
          <div class="w-7 h-7" />
        </template>
      </ClientOnly>
      <LanguageSwitcher />

      <UDropdown :items="menuItems" :popper="{ placement: 'bottom-end' }">
        <button
          type="button"
          class="flex items-center gap-2 rounded-full pl-1 pr-1.5 sm:pr-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <img
            v-if="avatarUrl"
            :src="avatarUrl"
            class="w-8 h-8 rounded-full object-cover shrink-0 shadow-sm"
            alt=""
          />
          <div
            v-else
            class="flex items-center justify-center w-8 h-8 rounded-full text-white text-xs font-semibold uppercase shrink-0 shadow-sm"
            :class="avatarGradient(username)"
          >
            {{ username?.slice(0, 2) }}
          </div>
          <div class="hidden sm:block min-w-0 max-w-[9rem] text-left">
            <p class="text-sm font-medium text-gray-900 dark:text-white truncate leading-tight">
              {{ username }}
            </p>
            <UBadge v-if="role" :color="isAdmin ? 'pink' : 'gray'" variant="subtle" size="xs">{{
              role
            }}</UBadge>
          </div>
          <UIcon
            name="i-heroicons-chevron-down"
            class="hidden sm:block w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0"
          />
        </button>
      </UDropdown>
    </div>
  </header>
</template>

<script setup lang="ts">
const props = defineProps<{
  username?: string | null
  role?: string | null
  isAdmin?: boolean
  avatarUrl?: string | null
}>()

const emit = defineEmits<{
  'open-menu': []
  'open-search': []
  logout: []
}>()

const { t } = useI18n()

const menuItems = computed(() => [
  [
    {
      label: t('common.signedInAs', { username: props.username ?? '' }),
      disabled: true
    }
  ],
  [
    {
      label: t('common.profile'),
      icon: 'i-heroicons-user-circle',
      to: '/profile'
    }
  ],
  [
    {
      label: t('common.logout'),
      icon: 'i-heroicons-arrow-right-on-rectangle',
      click: () => emit('logout')
    }
  ]
])
</script>
