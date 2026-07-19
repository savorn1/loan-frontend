<template>
  <UButton
    :icon="isDark ? 'i-heroicons-sun' : 'i-heroicons-moon'"
    color="gray"
    variant="ghost"
    size="xs"
    :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
    @click="toggle"
  />
</template>

<script setup lang="ts">
// @nuxtjs/color-mode ships as a dependency of @nuxt/ui, so useColorMode() is
// available without any extra module registration. It persists the choice in
// localStorage and syncs the `dark`/`light` class on <html> that Tailwind's
// `darkMode: 'class'` strategy (set by Nuxt UI) reads.
const colorMode = useColorMode()

const isDark = computed(() => colorMode.value === 'dark')

function toggle() {
  colorMode.preference = isDark.value ? 'light' : 'dark'
}
</script>
