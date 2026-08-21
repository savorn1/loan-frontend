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
        class="sm:hidden"
        :aria-label="t('commandPalette.open')"
        @click="emit('open-search')"
      />
      <UButton
        icon="i-heroicons-magnifying-glass"
        color="gray"
        variant="ghost"
        class="hidden sm:flex items-center gap-1.5"
        :aria-label="t('commandPalette.open')"
        @click="emit('open-search')"
      >
        <kbd
          class="font-sans text-[10px] leading-none text-gray-400 dark:text-gray-500 border border-gray-300 dark:border-gray-700 rounded px-1 py-0.5"
          >⌘K</kbd
        >
      </UButton>
      <ClientOnly>
        <UPopover :popper="{ placement: 'bottom-end' }">
          <div class="relative">
            <UButton
              icon="i-heroicons-bell"
              color="gray"
              variant="ghost"
              square
              :aria-label="t('appBar.notifications')"
              @click="markNotificationsSeen"
            />
            <span
              v-if="notificationsError"
              class="absolute -top-0.5 -right-0.5 flex h-3 w-3 rounded-full bg-amber-500 ring-2 ring-white dark:ring-gray-900 pointer-events-none"
            />
            <span
              v-else-if="unreadNotificationCount > 0"
              class="absolute -top-0.5 -right-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white pointer-events-none"
            >
              {{ unreadNotificationCount > 9 ? '9+' : unreadNotificationCount }}
            </span>
          </div>

          <template #panel>
            <div class="w-80 max-h-96 overflow-y-auto p-2">
              <div class="flex items-center justify-between px-2 py-1.5">
                <span class="text-sm font-semibold text-gray-900 dark:text-white">{{
                  t('appBar.notifications')
                }}</span>
                <NuxtLink to="/notifications" class="text-xs text-primary-500 hover:underline">{{
                  t('appBar.viewAll')
                }}</NuxtLink>
              </div>
              <div
                v-if="notificationsPending"
                class="py-6 text-center text-sm text-gray-500 dark:text-gray-400"
              >
                {{ t('common.loading') }}
              </div>
              <div
                v-else-if="notificationsError && !notificationItems.length"
                class="flex flex-col items-center gap-2 py-6 text-center text-sm text-gray-500 dark:text-gray-400"
              >
                <span>{{ t('appBar.error') }}</span>
                <UButton size="xs" variant="soft" color="gray" @click="refreshNotifications">{{
                  t('appBar.retry')
                }}</UButton>
              </div>
              <div
                v-else-if="!notificationItems.length"
                class="py-6 text-center text-sm text-gray-500 dark:text-gray-400"
              >
                {{ t('appBar.empty') }}
              </div>
              <ul v-else class="divide-y divide-gray-100 dark:divide-gray-800">
                <li v-for="n in notificationItems.slice(0, 8)" :key="n.id" class="py-2 px-2">
                  <p class="text-sm text-gray-900 dark:text-white font-medium truncate">
                    {{ n.subject || n.message }}
                  </p>
                  <p
                    v-if="n.subject"
                    class="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5"
                  >
                    {{ n.message }}
                  </p>
                  <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {{ formatDateTime(n.createdAt) }}
                  </p>
                </li>
              </ul>
            </div>
          </template>
        </UPopover>
        <ColorModeToggle />
        <template #fallback>
          <div class="flex items-center gap-1.5 sm:gap-2">
            <div class="w-7 h-7" />
            <div class="w-7 h-7" />
          </div>
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

const {
  items: notificationItems,
  unreadCount: unreadNotificationCount,
  pending: notificationsPending,
  error: notificationsError,
  markSeen: markNotificationsSeen,
  refresh: refreshNotifications
} = useNotificationBell()

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
