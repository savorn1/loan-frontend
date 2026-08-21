<template>
  <UModal v-model="open" :ui="{ width: 'sm:max-w-xl' }">
    <UCommandPalette
      :groups="commandGroups"
      :placeholder="t('commandPalette.placeholder')"
      :empty-state="{
        icon: 'i-heroicons-magnifying-glass',
        label: t('commandPalette.emptyLabel'),
        queryLabel: t('commandPalette.emptyLabel')
      }"
      @update:model-value="onSelect"
    />
  </UModal>
</template>

<script setup lang="ts">
import type { CustomerResponse } from '~/features/customers/types'
import type { LoanResponse } from '~/features/loans/types'
import type { PageResponse } from '~/shared/types'

// Minimal local shape for what UCommandPalette actually needs (id/label/icon plus
// either `to` or `click`) — avoids reaching into @nuxt/ui's unexported internal
// types (its package.json only publishes `./dist/module.d.mts`).
interface CommandItem {
  id: string
  label: string
  icon: string
  to?: string
  click?: () => void
}
interface CommandGroup {
  key: string
  label: string
  commands: CommandItem[]
  /** When set, UCommandPalette calls this (debounced) with the query instead of
   * fuzzy-matching `commands` locally — used for the customers/loans groups below,
   * which look up records via the backend rather than a preloaded list. */
  search?: (query: string) => Promise<CommandItem[]>
}

const open = defineModel<boolean>({ default: false })

const props = defineProps<{
  groups: {
    title?: string
    icon?: string
    color?: string
    links: { label: string; to: string; icon: string }[]
  }[]
}>()

const emit = defineEmits<{
  'change-password': []
  logout: []
}>()

const { t } = useI18n()
const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')
const api = useApi()
const { recent: recentPaths } = useRecentPages()

// Customers: same free-text `search` endpoint the loans list's customer filter
// dropdown already uses. Loans: no backend text-search endpoint exists, so a
// purely numeric query is looked up as a loan ID directly instead.
async function searchCustomersGroup(query: string): Promise<CommandItem[]> {
  const q = query.trim()
  if (!q) return []
  try {
    const result = await api<PageResponse<CustomerResponse>>('/customers', {
      query: { search: q, size: 8 }
    })
    return result.content.map((c) => ({
      id: `customer-${c.id}`,
      label: `${c.firstName} ${c.lastName} (#${c.id})`,
      icon: 'i-heroicons-user',
      to: `/customers/${c.id}`
    }))
  } catch {
    return []
  }
}

async function searchLoansGroup(query: string): Promise<CommandItem[]> {
  const q = query.trim()
  if (!/^\d+$/.test(q)) return []
  try {
    const loan = await api<LoanResponse>(`/loans/${q}`)
    return [
      {
        id: `loan-${loan.id}`,
        label: t('commandPalette.loanResultLabel', { id: loan.id, customer: loan.customerName }),
        icon: 'i-heroicons-banknotes',
        to: `/loans/${loan.id}`
      }
    ]
  } catch {
    return []
  }
}

// Pages: one command per sidebar link, grouped exactly as the sidebar groups them —
// same `groups` data SidebarContent.vue already renders, not duplicated here.
// Actions: a few high-value commands that reuse handlers the layout already has
// (change-password/logout mirror AppBar.vue's existing emits; theme toggle calls
// useColorMode() directly, same as ColorModeToggle.vue).
const commandGroups = computed<CommandGroup[]>(() => {
  const pageGroups: CommandGroup[] = props.groups.map((group, i) => ({
    key: group.title ?? `general-${i}`,
    label: group.title ?? t('commandPalette.generalGroup'),
    commands: group.links.map((link) => ({
      id: link.to,
      label: link.label,
      icon: link.icon,
      to: link.to
    }))
  }))

  // Recent: last few pages actually visited, resolved back to their nav label/icon
  // via the flattened sidebar links — a path no longer in the sidebar (renamed or
  // removed) just silently drops out instead of rendering broken. Listed first so
  // it's what shows up top when the palette opens with an empty query; when the
  // user types, it still participates in the same fuzzy match as every other page.
  const linkByPath = new Map(props.groups.flatMap((g) => g.links).map((l) => [l.to, l]))
  const recentGroup: CommandGroup = {
    key: 'recent',
    label: t('commandPalette.recentGroup'),
    commands: recentPaths.value
      .map((path) => linkByPath.get(path))
      .filter((link): link is { label: string; to: string; icon: string } => !!link)
      .map((link) => ({ id: `recent-${link.to}`, label: link.label, icon: link.icon, to: link.to }))
  }

  return [
    ...(recentGroup.commands.length ? [recentGroup] : []),
    ...pageGroups,
    {
      key: 'customers',
      label: t('commandPalette.customersGroup'),
      commands: [],
      search: searchCustomersGroup
    },
    {
      key: 'loans',
      label: t('commandPalette.loansGroup'),
      commands: [],
      search: searchLoansGroup
    },
    {
      key: 'actions',
      label: t('commandPalette.actionsGroup'),
      commands: [
        {
          id: 'toggle-theme',
          label: isDark.value ? t('common.switchToLight') : t('common.switchToDark'),
          icon: isDark.value ? 'i-heroicons-sun' : 'i-heroicons-moon',
          click: () => {
            colorMode.preference = isDark.value ? 'light' : 'dark'
          }
        },
        {
          id: 'change-password',
          label: t('common.password'),
          icon: 'i-heroicons-key',
          click: () => emit('change-password')
        },
        {
          id: 'logout',
          label: t('common.logout'),
          icon: 'i-heroicons-arrow-right-on-rectangle',
          click: () => emit('logout')
        }
      ]
    }
  ]
})

// UCommandPalette doesn't navigate on its own — it just emits the selected command
// (see its compiled onSelect: `emit('update:modelValue', option)`), so the consumer
// handles both possible shapes here.
function onSelect(command: { to?: string; click?: () => void } | null) {
  if (!command) return
  if (command.to) {
    navigateTo(command.to)
  } else {
    command.click?.()
  }
  open.value = false
}
</script>
