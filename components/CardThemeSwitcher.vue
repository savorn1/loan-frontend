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
import { CARD_THEMES } from '~/shared/composables/useCardTheme'

const { t } = useI18n()
const { theme } = useCardTheme()

const labels: Record<(typeof CARD_THEMES)[number], string> = {
  plain: t('common.cardStylePlain'),
  soft: t('common.cardStyleSoft'),
  bordered: t('common.cardStyleBordered')
}

const options = CARD_THEMES.map((value) => ({ value, label: labels[value] }))
</script>
