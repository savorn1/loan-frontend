<template>
  <UModal v-model="open">
    <UCard>
      <template #header>
        <span class="font-semibold">{{ title }}</span>
      </template>
      <p class="text-sm text-gray-500 dark:text-gray-400">{{ description }}</p>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="gray" variant="ghost" @click="open = false">{{
            t('common.cancel')
          }}</UButton>
          <UButton :color="color" :loading="loading" @click="emit('confirm')">{{
            confirmLabel || t('common.confirm')
          }}</UButton>
        </div>
      </template>
    </UCard>
  </UModal>
</template>

<script setup lang="ts">
const open = defineModel<boolean>({ default: false })
const { t } = useI18n()

withDefaults(
  defineProps<{
    title: string
    description: string
    confirmLabel?: string
    color?: 'primary' | 'red' | 'green' | 'gray' | 'orange'
    loading?: boolean
  }>(),
  {
    confirmLabel: '',
    color: 'primary',
    loading: false
  }
)

const emit = defineEmits<{ confirm: [] }>()
</script>
