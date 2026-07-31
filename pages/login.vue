<template>
  <div>
    <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-1">{{ t('auth.welcomeBack') }}</h2>
    <p class="text-sm text-gray-500 dark:text-gray-400 mb-8">
      {{ t('auth.signInSubtitle') }}
    </p>

    <UForm :state="form" class="space-y-4" @submit="onSubmit">
      <UInput
        v-model="form.username"
        :placeholder="t('auth.usernamePlaceholder')"
        icon="i-heroicons-user"
        size="lg"
        autocomplete="username"
        autofocus
        required
        :aria-label="t('auth.usernamePlaceholder')"
        :ui="{ rounded: 'rounded-full' }"
      />
      <UInput
        v-model="form.password"
        :type="showPassword ? 'text' : 'password'"
        :placeholder="t('auth.passwordPlaceholder')"
        icon="i-heroicons-lock-closed"
        size="lg"
        autocomplete="current-password"
        required
        :aria-label="t('auth.passwordPlaceholder')"
        :ui="{ rounded: 'rounded-full' }"
      >
        <template #trailing>
          <UButton
            color="gray"
            variant="link"
            :padded="false"
            class="pointer-events-auto"
            :icon="showPassword ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
            :aria-label="showPassword ? t('auth.hidePassword') : t('auth.showPassword')"
            @click="showPassword = !showPassword"
          />
        </template>
      </UInput>

      <UAlert
        v-if="error"
        color="red"
        variant="subtle"
        :title="error"
        icon="i-heroicons-exclamation-triangle"
      />

      <UButton type="submit" block size="lg" :loading="loading" :ui="{ rounded: 'rounded-full' }">
        {{ t('auth.signIn') }}
      </UButton>
    </UForm>

    <p class="text-sm text-center mt-6 text-gray-500">
      {{ t('auth.noAccount') }}
      <NuxtLink to="/register" class="text-primary-500 font-medium">{{ t('auth.signUp') }}</NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
import type { LoginRequest } from '~/features/auth/types'

definePageMeta({ layout: 'auth' })

const { t } = useI18n()
const { login } = useAuth()
const form = reactive<LoginRequest>({ username: '', password: '' })
const loading = ref(false)
const error = ref('')
const showPassword = ref(false)

async function onSubmit() {
  loading.value = true
  error.value = ''
  try {
    await login(form)
    await navigateTo('/')
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    loading.value = false
  }
}
</script>
