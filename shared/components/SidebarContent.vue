<template>
  <div class="flex flex-col h-full">
    <div class="h-16 shrink-0 flex items-center gap-2.5 px-5 border-b border-gray-200 dark:border-gray-800">
      <NuxtLink to="/" class="flex items-center gap-2.5">
        <span class="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-teal-600 text-white shrink-0 shadow-sm">
          <UIcon name="i-heroicons-banknotes" class="w-4.5 h-4.5" />
        </span>
        <span class="font-bold text-gray-900 dark:text-white tracking-tight">LMS</span>
      </NuxtLink>
    </div>
    <UVerticalNavigation
      :links="links"
      class="flex-1 px-3 py-4 overflow-y-auto"
      :ui="{
        base: 'group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        padding: 'px-0 py-0',
        rounded: 'rounded-lg',
        icon: { base: 'w-5 h-5 shrink-0' },
        active: 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-400/10 before:hidden',
        inactive: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
      }"
    />
    <div class="shrink-0 border-t border-gray-200 dark:border-gray-800 px-4 py-3 space-y-3">
      <div class="flex items-center gap-2">
        <div
          class="flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-semibold uppercase shrink-0 shadow-sm"
          :class="avatarGradient(username)"
        >
          {{ username?.slice(0, 2) }}
        </div>
        <div class="min-w-0">
          <p class="text-sm font-medium text-gray-900 dark:text-white truncate leading-tight">{{ username }}</p>
          <UBadge v-if="role" :color="isAdmin ? 'primary' : 'gray'" variant="subtle" size="xs">{{ role }}</UBadge>
        </div>
      </div>
      <div class="flex items-center justify-between">
        <ColorModeToggle />
        <div class="flex items-center gap-1">
          <UButton size="xs" color="gray" variant="ghost" icon="i-heroicons-key" @click="emit('change-password')">
            Password
          </UButton>
          <UButton size="xs" color="gray" variant="ghost" icon="i-heroicons-arrow-right-on-rectangle" @click="emit('logout')" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  links: { label: string; to: string; icon: string }[][]
  username?: string | null
  role?: string | null
  isAdmin?: boolean
}>()

const emit = defineEmits<{
  'change-password': []
  logout: []
}>()
</script>
