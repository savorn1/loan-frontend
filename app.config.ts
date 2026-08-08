// Nuxt UI theme tokens — every UButton/UBadge/UCard/UInput/etc. across the app
// pulls its Tailwind classes from here, so this is the one place that sets the
// app's visual identity instead of components hard-coding colors ad hoc.
//
// The rounded-full buttons + rounded-2xl cards give the whole app the same
// soft, friendly look the login screen introduced, without touching each page.
export default defineAppConfig({
  ui: {
    primary: 'emerald',
    gray: 'slate',
    card: {
      rounded: 'rounded-md',
      shadow: 'shadow-sm',
      ring: 'ring-1 ring-gray-200/70 dark:ring-gray-800'
    },
    button: {
      rounded: 'rounded-full',
      default: {
        size: 'sm'
      }
    },
    input: {
      rounded: 'rounded-md',
      default: {
        size: 'md'
      }
    },
    select: {
      rounded: 'rounded-md',
      default: {
        size: 'md'
      }
    },
    selectMenu: {
      rounded: 'rounded-md'
    },
    textarea: {
      rounded: 'rounded-md'
    },
    inputMenu: {
      rounded: 'rounded-md'
    },
    badge: {
      rounded: 'rounded-md'
    },
    modal: {
      rounded: 'rounded-md'
    },
    table: {
      divide: 'divide-y divide-gray-200 dark:divide-gray-800',
      tr: {
        selected: 'bg-primary-50 dark:bg-primary-400/10',
        active: 'hover:bg-primary-50 dark:hover:bg-primary-400/10 cursor-pointer'
      },
      default: {
        sortButton: {
          class: '-m-1.5 font-semibold'
        }
      }
    }
  },
  // Presets for DataTable's user-selectable style (see useTableTheme). `ui` is a
  // partial UTable `:ui` prop — it deep-merges with the table config above through
  // Nuxt UI's own defu/tailwind-merge, so th/td overrides never need `!important`
  // or raw CSS selectors.
  //
  // `rowEvenClass` covers zebra striping, which UTable has no config slot for
  // since it styles all rows uniformly — DataTable applies it per-row via Nuxt
  // UI's supported `row.class` field instead.
  //
  // `sortButtonClass` can't live under `ui.default.sortButton` like the rest:
  // UTable's `sortButton` prop has a static default (resolved once, ignoring
  // `:ui`) that the component spreads *after* `ui.default.sortButton`, so it
  // silently wins regardless. DataTable passes `sortButtonClass` as an actual
  // `:sort-button` prop instead, which the icon/color/variant still fall
  // through from `ui.default.sortButton` since only `class` is set here.
  tableThemes: {
    plain: {
      ui: {},
      rowEvenClass: '',
      sortButtonClass: ''
    },
    striped: {
      ui: {},
      rowEvenClass: 'bg-gray-100 dark:bg-gray-800/60',
      sortButtonClass: ''
    },
    bordered: {
      rowEvenClass: '',
      sortButtonClass:
        '-m-1.5 font-semibold text-white hover:text-white hover:bg-primary-600 dark:hover:bg-primary-600',
      ui: {
        th: {
          color: 'text-white bg-primary-500 dark:bg-primary-600',
          base: 'text-left rtl:text-right border border-primary-400 dark:border-primary-800'
        },
        td: {
          base: 'whitespace-nowrap border border-gray-200 dark:border-gray-800'
        }
      }
    }
  },
  // Presets for AppCard's user-selectable style (see useCardTheme). `ui` is a
  // partial UCard `:ui` prop. None of these fields sit under a `default.*`
  // namespace (unlike table's sortButton), so tailwind-merge handles the
  // override cleanly — no equivalent of DataTable's `:sort-button` workaround
  // is needed here.
  cardThemes: {
    plain: {
      ui: {}
    },
    soft: {
      ui: {
        background: 'bg-gray-50 dark:bg-gray-800/40'
      }
    },
    bordered: {
      ui: {
        ring: 'ring-2 ring-primary-400 dark:ring-primary-700',
        header: {
          background: 'bg-primary-500 dark:bg-primary-600',
          base: 'text-white'
        }
      }
    }
  }
})
