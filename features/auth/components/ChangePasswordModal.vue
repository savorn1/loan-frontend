<template>
  <UModal v-model="open">
    <UCard>
      <template #header>
        <span class="font-semibold">Change Password</span>
      </template>
      <UForm :state="form" class="space-y-4" @submit="onSubmit">
        <UFormGroup label="Current password" name="currentPassword" required>
          <UInput v-model="form.currentPassword" :type="showPassword ? 'text' : 'password'" icon="i-heroicons-lock-closed" autocomplete="current-password" required />
        </UFormGroup>
        <UFormGroup label="New password" name="newPassword" required>
          <UInput v-model="form.newPassword" :type="showPassword ? 'text' : 'password'" icon="i-heroicons-lock-closed" autocomplete="new-password" minlength="6" required>
            <template #trailing>
              <UButton
                color="gray" variant="link" :padded="false"
                :icon="showPassword ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
                :aria-label="showPassword ? 'Hide passwords' : 'Show passwords'"
                @click="showPassword = !showPassword"
              />
            </template>
          </UInput>
        </UFormGroup>
        <UFormGroup label="Confirm new password" name="confirmPassword" required>
          <UInput v-model="confirmPassword" :type="showPassword ? 'text' : 'password'" icon="i-heroicons-lock-closed" autocomplete="new-password" required />
        </UFormGroup>
        <UAlert v-if="error" color="red" variant="subtle" :title="error" />
        <div class="flex justify-end gap-2 pt-2">
          <UButton color="gray" variant="ghost" @click="open = false">Cancel</UButton>
          <UButton type="submit" :loading="loading">Update password</UButton>
        </div>
      </UForm>
    </UCard>
  </UModal>
</template>

<script setup lang="ts">
import type { ChangePasswordRequest } from '~/features/auth/types'

const open = defineModel<boolean>({ default: false })

const { changePassword } = useAuth()
const toast = useToast()

const form = reactive<ChangePasswordRequest>({ currentPassword: '', newPassword: '' })
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')
const showPassword = ref(false)

watch(open, (value) => {
  if (value) {
    form.currentPassword = ''
    form.newPassword = ''
    confirmPassword.value = ''
    error.value = ''
    showPassword.value = false
  }
})

async function onSubmit() {
  error.value = ''
  if (form.newPassword !== confirmPassword.value) {
    error.value = 'New password and confirmation do not match.'
    return
  }
  loading.value = true
  try {
    await changePassword(form)
    toast.add({ title: 'Password updated', color: 'green' })
    open.value = false
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    loading.value = false
  }
}
</script>
