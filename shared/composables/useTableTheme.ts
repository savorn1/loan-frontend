export type TableTheme = 'plain' | 'striped' | 'bordered'

export const TABLE_THEMES: TableTheme[] = ['plain', 'striped', 'bordered']

// Persisted in a cookie (like the i18n locale) rather than @nuxtjs/color-mode's
// localStorage approach, so the choice is available on the server render and
// there's no flash of the default style on load. Presets live in app.config.ts
// alongside the rest of the design tokens (card, button, table...).
export function useTableTheme() {
  const appConfig = useAppConfig()
  const theme = useCookie<TableTheme>('table_theme', {
    default: () => 'plain',
    maxAge: 60 * 60 * 24 * 365
  })

  const preset = computed(() => appConfig.tableThemes[theme.value])
  const tableUi = computed(() => preset.value.ui)
  const rowEvenClass = computed(() => preset.value.rowEvenClass)
  const sortButtonClass = computed(() => preset.value.sortButtonClass)

  return { theme, tableUi, rowEvenClass, sortButtonClass }
}
