<template>
  <UModal v-model="open">
    <UCard>
      <template #header>
        <span class="font-semibold">{{ title }}</span>
      </template>
      <p class="text-sm text-gray-500 dark:text-gray-400">{{ description }}</p>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="gray" variant="ghost" @click="open = false">Cancel</UButton>
          <UButton :color="color" :loading="loading" @click="emit('confirm')">{{
            confirmLabel
          }}</UButton>
        </div>
      </template>
    </UCard>
  </UModal>
</template>

<script setup lang="ts">
const open = defineModel<boolean>({ default: false })

withDefaults(
  defineProps<{
    title: string
    description: string
    confirmLabel?: string
    color?: 'primary' | 'red' | 'green' | 'gray' | 'orange'
    loading?: boolean
  }>(),
  {
    confirmLabel: 'Confirm',
    color: 'primary',
    loading: false
  }
)

const emit = defineEmits<{ confirm: [] }>()
</script>
