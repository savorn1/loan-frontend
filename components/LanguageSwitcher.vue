<template>
  <div
    class="flex items-center gap-0.5 rounded-full bg-gray-100 dark:bg-gray-800 p-0.5"
    role="group"
    :aria-label="t('common.language')"
  >
    <button
      v-for="loc in availableLocales"
      :key="loc.code"
      type="button"
      class="px-2 py-0.5 rounded-full text-xs font-semibold uppercase transition-colors"
      :class="
        locale === loc.code
          ? 'bg-white dark:bg-gray-900 text-primary-600 dark:text-primary-400 shadow-sm'
          : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
      "
      @click="setLocale(loc.code as 'en' | 'km')"
    >
      {{ loc.code }}
    </button>
  </div>
</template>

<script setup lang="ts">
const { t, locale, locales, setLocale } = useI18n()

const availableLocales = computed(() => locales.value)
</script>
