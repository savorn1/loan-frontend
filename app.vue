<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <UNotifications
    :ui="{ wrapper: 'fixed flex flex-col justify-start z-[55]', position: 'top-0 end-0' }"
  />
</template>

<script setup lang="ts">
// Khmer glyphs render visually smaller than Latin ones at the same font-size,
// so the base size is bumped for `km` via the `html[lang]` rule in main.css.
const { locale } = useI18n()
useHead({
  htmlAttrs: {
    lang: computed(() => locale.value)
  }
})
</script>
