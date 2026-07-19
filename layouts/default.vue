<template>
  <div class="min-h-screen flex bg-gray-50 dark:bg-gray-900">
    <aside class="w-56 shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col">
      <div class="h-14 flex items-center px-4 border-b border-gray-200 dark:border-gray-800">
        <NuxtLink to="/" class="font-bold text-gray-900 dark:text-white">LMS</NuxtLink>
      </div>
      <UVerticalNavigation :links="links" class="flex-1 px-2 py-4" />
      <div class="border-t border-gray-200 dark:border-gray-800 px-3 py-3 space-y-2">
        <div class="flex items-center gap-2 px-1">
          <UBadge v-if="role" :color="isAdmin ? 'primary' : 'gray'" variant="subtle">{{ role }}</UBadge>
          <span class="text-sm text-gray-600 dark:text-gray-300 truncate">{{ username }}</span>
        </div>
        <div class="flex items-center justify-between">
          <ColorModeToggle />
          <div class="flex items-center gap-1">
            <UButton size="xs" color="gray" variant="ghost" icon="i-heroicons-key" @click="showChangePassword = true">
              Password
            </UButton>
            <UButton size="xs" color="gray" variant="ghost" icon="i-heroicons-arrow-right-on-rectangle" @click="onLogout" />
          </div>
        </div>
      </div>
    </aside>
    <main class="flex-1 min-w-0 px-6 py-6">
      <slot />
    </main>
    <ChangePasswordModal v-model="showChangePassword" />
  </div>
</template>

<script setup lang="ts">
const auth = useAuth()
const { username, role, isAdmin } = storeToRefs(auth)
const { logout } = auth

const links = computed(() => [[
  { label: 'Customers', to: '/customers', icon: 'i-heroicons-users' },
  { label: 'Loans', to: '/loans', icon: 'i-heroicons-banknotes' },
  { label: 'Payments', to: '/payments', icon: 'i-heroicons-credit-card' },
  ...(isAdmin.value ? [{ label: 'Users', to: '/users', icon: 'i-heroicons-shield-check' }] : [])
]])

const showChangePassword = ref(false)

async function onLogout() {
  await logout()
  navigateTo('/login')
}
</script>
