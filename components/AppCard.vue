<template>
  <UCard :ui="mergedUi">
    <template v-if="$slots.header" #header>
      <slot name="header" />
    </template>
    <slot />
    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </UCard>
</template>

<script setup lang="ts">
// Drop-in replacement for UCard that applies the user's card style
// preference (see useCardTheme). Existing <UCard> usages are untouched —
// use this for new cards that should follow the theme.
const props = defineProps<{ ui?: Record<string, any> }>()

const { cardUi } = useCardTheme()

// Caller's `ui` prop wins per-field over the theme (e.g. a one-off body
// padding tweak), shallow-merged one level deep for the header/body/footer
// sub-objects — the only nesting UCard's config has.
const mergedUi = computed(() => ({
  ...cardUi.value,
  ...props.ui,
  header: { ...cardUi.value?.header, ...props.ui?.header },
  body: { ...cardUi.value?.body, ...props.ui?.body },
  footer: { ...cardUi.value?.footer, ...props.ui?.footer }
}))
</script>
