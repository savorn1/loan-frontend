<template>
  <div>
    <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-1">{{ t('auth.createAccount') }}</h2>
    <p class="text-sm text-gray-500 dark:text-gray-400 mb-8">
      {{ t('auth.registerSubtitle') }}
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
        :placeholder="t('auth.passwordWithHint')"
        icon="i-heroicons-lock-closed"
        size="lg"
        autocomplete="new-password"
        required
        minlength="6"
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
      <UInput
        v-model="confirm"
        :type="showPassword ? 'text' : 'password'"
        :placeholder="t('auth.confirmPasswordPlaceholder')"
        icon="i-heroicons-lock-closed"
        size="lg"
        required
        :aria-label="t('auth.confirmPasswordPlaceholder')"
        :ui="{ rounded: 'rounded-full' }"
      />

      <UAlert
        v-if="error"
        color="red"
        variant="subtle"
        :title="error"
        icon="i-heroicons-exclamation-triangle"
      />

      <UButton type="submit" block size="lg" :loading="loading" :ui="{ rounded: 'rounded-full' }">
        {{ t('auth.createAccount') }}
      </UButton>
    </UForm>

    <p class="text-sm text-center mt-6 text-gray-500">
      {{ t('auth.alreadyHaveAccount') }}
      <NuxtLink to="/login" class="text-primary-500 font-medium">{{ t('auth.signIn') }}</NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
import type { RegisterRequest } from '~/features/auth/types'

definePageMeta({ layout: 'auth' })

const { t } = useI18n()
const { register } = useAuth()
const form = reactive<RegisterRequest>({ username: '', password: '' })
const confirm = ref('')
const loading = ref(false)
const error = ref('')
const showPassword = ref(false)

async function onSubmit() {
  if (form.password !== confirm.value) {
    error.value = t('auth.passwordsDoNotMatch')
    return
  }
  loading.value = true
  error.value = ''
  try {
    await register(form)
    await navigateTo('/')
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    loading.value = false
  }
}
</script>
