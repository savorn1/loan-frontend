export type CardTheme = 'plain' | 'soft' | 'bordered'

export const CARD_THEMES: CardTheme[] = ['plain', 'soft', 'bordered']

// Independent from table_theme (see useTableTheme) — a bordered table and a
// bordered card are different visual intents, so they're picked separately.
// Presets live in app.config.ts alongside the rest of the design tokens.
export function useCardTheme() {
  const appConfig = useAppConfig()
  const theme = useCookie<CardTheme>('card_theme', {
    default: () => 'plain',
    maxAge: 60 * 60 * 24 * 365
  })

  // Typed loosely: presets only declare the fields they customize (`header`
  // for bordered, etc.), and consumers like AppCard merge in other UCard `ui`
  // fields (body, footer...) that no preset currently touches.
  const cardUi = computed<Record<string, any>>(() => appConfig.cardThemes[theme.value].ui)

  return { theme, cardUi }
}
