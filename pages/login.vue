<template>
  <div>
    <h2 class="text-lg font-semibold mb-4 text-center">Sign in</h2>
    <UForm :state="form" class="space-y-4" @submit="onSubmit">
      <UFormGroup label="Username" name="username">
        <UInput v-model="form.username" autocomplete="username" required />
      </UFormGroup>
      <UFormGroup label="Password" name="password">
        <UInput v-model="form.password" type="password" autocomplete="current-password" required />
      </UFormGroup>
      <UAlert v-if="error" color="red" variant="subtle" :title="error" />
      <UButton type="submit" block :loading="loading">Sign in</UButton>
    </UForm>
    <p class="text-sm text-center mt-4 text-gray-500">
      No account?
      <NuxtLink to="/register" class="text-primary-500 font-medium">Register</NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
import type { LoginRequest } from '~/features/auth/types'

definePageMeta({ layout: 'auth' })

const { login } = useAuth()
const form = reactive<LoginRequest>({ username: '', password: '' })
const loading = ref(false)
const error = ref('')

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
