<template>
  <div class="flex items-center gap-1 w-full sm:w-auto">
    <DatePicker
      v-model="from"
      class="flex-1 sm:w-36"
      :placeholder="t('common.dateRangeFilter.from')"
      :max="to || undefined"
    />
    <span class="text-gray-400 dark:text-gray-500 text-sm">–</span>
    <DatePicker
      v-model="to"
      class="flex-1 sm:w-36"
      :placeholder="t('common.dateRangeFilter.to')"
      :min="from || undefined"
    />
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

const from = defineModel<string>('from', { default: '' })
const to = defineModel<string>('to', { default: '' })
</script>
