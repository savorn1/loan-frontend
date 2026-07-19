<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 relative">
    <div class="absolute top-4 right-4">
      <ColorModeToggle />
    </div>
    <div class="w-full max-w-sm">
      <div class="text-center mb-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Loan Management System</h1>
      </div>
      <UCard>
        <slot />
      </UCard>
    </div>
  </div>
</template>
