<template>
  <div class="min-h-screen flex bg-white dark:bg-gray-950">
    <!-- Branding panel — hidden below lg, where the form takes the full viewport -->
    <div
      class="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-600 to-teal-700 text-white flex-col justify-between p-12"
    >
      <div
        class="absolute inset-0 opacity-20 [background:radial-gradient(circle_at_20%_15%,white,transparent_45%)]"
      />
      <!-- Slow drifting blobs (assets/css/main.css) — purely decorative -->
      <div
        class="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-white/10 blur-2xl animate-blob"
        aria-hidden="true"
      />
      <div
        class="absolute bottom-24 -left-20 w-80 h-80 rounded-full bg-teal-400/20 blur-3xl animate-blob animation-delay-4s"
        aria-hidden="true"
      />
      <div
        class="absolute top-1/3 right-1/4 w-40 h-40 rounded-full bg-emerald-300/15 blur-xl animate-blob animation-delay-8s"
        aria-hidden="true"
      />

      <NuxtLink to="/" class="relative flex items-center gap-2.5">
        <span class="flex items-center justify-center w-9 h-9 rounded-lg bg-white/15 backdrop-blur">
          <UIcon name="i-heroicons-banknotes" class="w-5 h-5" />
        </span>
        <span class="font-bold text-lg tracking-tight">Loan Management System</span>
      </NuxtLink>

      <div class="relative max-w-sm">
        <h1 class="text-4xl font-bold leading-tight mb-4">Hey, Hello!</h1>
        <p class="text-lg font-medium text-white/90 mb-3">
          Manage every loan, customer, and payment in one place.
        </p>
        <p class="text-sm text-white/70">
          Track applications from request to payoff, keep the payment schedule on track, and give
          your team one shared source of truth.
        </p>
      </div>

      <p class="relative text-xs text-white/60">&copy; {{ year }} Loan Management System</p>
    </div>

    <!-- Form panel -->
    <div class="flex-1 flex items-center justify-center px-6 py-12 relative">
      <div class="absolute top-4 right-4">
        <ColorModeToggle />
      </div>

      <div class="w-full max-w-sm">
        <div class="lg:hidden flex flex-col items-center text-center mb-8">
          <span
            class="flex items-center justify-center w-11 h-11 rounded-xl bg-primary-500 text-white mb-3 shadow-sm"
          >
            <UIcon name="i-heroicons-banknotes" class="w-6 h-6" />
          </span>
          <h1 class="text-xl font-bold text-gray-900 dark:text-white">Loan Management System</h1>
        </div>
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const year = new Date().getFullYear()
</script>
