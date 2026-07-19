<template>
  <div>
    <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-1">Create account</h2>
    <p class="text-sm text-gray-500 dark:text-gray-400 mb-8">New accounts start with standard user access.</p>

    <UForm :state="form" class="space-y-4" @submit="onSubmit">
      <UInput
        v-model="form.username"
        placeholder="Username"
        icon="i-heroicons-user"
        size="lg"
        autocomplete="username"
        autofocus
        required
        aria-label="Username"
        :ui="{ rounded: 'rounded-full' }"
      />
      <UInput
        v-model="form.password"
        :type="showPassword ? 'text' : 'password'"
        placeholder="Password (at least 6 characters)"
        icon="i-heroicons-lock-closed"
        size="lg"
        autocomplete="new-password"
        required
        minlength="6"
        aria-label="Password"
        :ui="{ rounded: 'rounded-full' }"
      >
        <template #trailing>
          <UButton
            color="gray" variant="link" :padded="false"
            :icon="showPassword ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
            :aria-label="showPassword ? 'Hide password' : 'Show password'"
            @click="showPassword = !showPassword"
          />
        </template>
      </UInput>
      <UInput
        v-model="confirm"
        :type="showPassword ? 'text' : 'password'"
        placeholder="Confirm password"
        icon="i-heroicons-lock-closed"
        size="lg"
        required
        aria-label="Confirm password"
        :ui="{ rounded: 'rounded-full' }"
      />

      <UAlert v-if="error" color="red" variant="subtle" :title="error" icon="i-heroicons-exclamation-triangle" />

      <UButton type="submit" block size="lg" :loading="loading" :ui="{ rounded: 'rounded-full' }">
        Create account
      </UButton>
    </UForm>

    <p class="text-sm text-center mt-6 text-gray-500">
      Already have an account?
      <NuxtLink to="/login" class="text-primary-500 font-medium">Sign in</NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
import type { RegisterRequest } from '~/features/auth/types'

definePageMeta({ layout: 'auth' })

const { register } = useAuth()
const form = reactive<RegisterRequest>({ username: '', password: '' })
const confirm = ref('')
const loading = ref(false)
const error = ref('')
const showPassword = ref(false)

async function onSubmit() {
  // New accounts are always created with role USER (see AuthServiceImpl —
  // there's no client-controlled role field). Promotion to ADMIN happens
  // directly in the DB.
  if (form.password !== confirm.value) {
    error.value = 'Passwords do not match'
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
