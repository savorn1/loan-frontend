<template>
  <div class="min-h-screen flex bg-gray-50 dark:bg-gray-950">
    <!-- Desktop sidebar -->
    <aside class="hidden lg:flex w-60 shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-col">
      <SidebarContent :links="links" :username="username" :role="role" :is-admin="isAdmin"
        @change-password="showChangePassword = true" @logout="onLogout" />
    </aside>

    <!-- Mobile off-canvas nav -->
    <USlideover v-model="mobileNavOpen" side="left" :ui="{ width: 'max-w-xs' }">
      <div class="flex flex-col h-full bg-white dark:bg-gray-900">
        <SidebarContent :links="links" :username="username" :role="role" :is-admin="isAdmin"
          @change-password="showChangePassword = true; mobileNavOpen = false" @logout="onLogout" />
      </div>
    </USlideover>

    <div class="flex-1 min-w-0 flex flex-col">
      <!-- Mobile top bar -->
      <header class="lg:hidden h-14 shrink-0 flex items-center gap-3 px-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-20">
        <UButton icon="i-heroicons-bars-3" color="gray" variant="ghost" square :aria-label="'Open menu'" @click="mobileNavOpen = true" />
        <span class="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-teal-600 text-white shrink-0 shadow-sm">
          <UIcon name="i-heroicons-banknotes" class="w-4 h-4" />
        </span>
        <span class="font-bold text-gray-900 dark:text-white tracking-tight">LMS</span>
      </header>

      <main class="flex-1 min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div class="max-w-6xl mx-auto">
          <slot />
        </div>
      </main>
    </div>

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
const mobileNavOpen = ref(false)

// Close the mobile drawer automatically whenever a nav link is followed.
const route = useRoute()
watch(() => route.fullPath, () => { mobileNavOpen.value = false })

async function onLogout() {
  await logout()
  navigateTo('/login')
}
</script>
