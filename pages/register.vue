<template>
  <div>
    <h2 class="text-lg font-semibold mb-4 text-center">Create account</h2>
    <UForm :state="form" class="space-y-4" @submit="onSubmit">
      <UFormGroup label="Username" name="username">
        <UInput v-model="form.username" autocomplete="username" required />
      </UFormGroup>
      <UFormGroup label="Password" name="password" help="At least 6 characters">
        <UInput v-model="form.password" type="password" autocomplete="new-password" required minlength="6" />
      </UFormGroup>
      <UFormGroup label="Confirm password" name="confirm">
        <UInput v-model="confirm" type="password" required />
      </UFormGroup>
      <UAlert v-if="error" color="red" variant="subtle" :title="error" />
      <UButton type="submit" block :loading="loading">Create account</UButton>
    </UForm>
    <p class="text-sm text-center mt-4 text-gray-500">
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
