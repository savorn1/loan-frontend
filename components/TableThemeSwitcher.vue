<template>
  <UButtonGroup size="xs">
    <UButton
      v-for="option in options"
      :key="option.value"
      :color="theme === option.value ? 'primary' : 'gray'"
      :variant="theme === option.value ? 'solid' : 'ghost'"
      @click="theme = option.value"
    >
      {{ option.label }}
    </UButton>
  </UButtonGroup>
</template>

<script setup lang="ts">
import { TABLE_THEMES } from '~/shared/composables/useTableTheme'

const { t } = useI18n()
const { theme } = useTableTheme()

const labels: Record<(typeof TABLE_THEMES)[number], string> = {
  plain: t('common.tableStylePlain'),
  striped: t('common.tableStyleStriped'),
  bordered: t('common.tableStyleBordered')
}

const options = TABLE_THEMES.map((value) => ({ value, label: labels[value] }))
</script>
