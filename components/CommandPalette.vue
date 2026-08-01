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

  return [
    ...pageGroups,
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
