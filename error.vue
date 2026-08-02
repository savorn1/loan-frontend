<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
    <div class="w-full max-w-sm">
      <ErrorState :icon="icon" :title="title" :description="description">
        <template #action>
          <div class="flex gap-2">
            <UButton v-if="!isNotFound" color="gray" variant="soft" @click="clearError()">
              {{ t('appError.retry') }}
            </UButton>
            <UButton icon="i-heroicons-home" @click="goHome">{{ t('appError.goHome') }}</UButton>
          </div>
        </template>
      </ErrorState>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
const { t } = useI18n()

const isNotFound = computed(() => props.error.statusCode === 404)
const icon = computed(() =>
  isNotFound.value ? 'i-heroicons-magnifying-glass' : 'i-heroicons-exclamation-triangle'
)
const title = computed(() => (isNotFound.value ? t('appError.notFoundTitle') : t('appError.title')))
const description = computed(() =>
  isNotFound.value ? t('appError.notFoundDescription') : t('appError.description')
)

function goHome() {
  clearError({ redirect: '/' })
}
</script>
