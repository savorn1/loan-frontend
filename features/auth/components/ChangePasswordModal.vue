<template>
  <UModal v-model="open">
    <UCard>
      <template #header>
        <span class="font-semibold">Change Password</span>
      </template>
      <DynamicForm
        v-model="form"
        :fields="fields"
        :loading="loading"
        :error="error"
        submit-label="Update password"
        cancelable
        @submit="onSubmit"
        @cancel="open = false"
      />
    </UCard>
  </UModal>
</template>

<script setup lang="ts">
// Declarative form on the shared <DynamicForm>/<Field> system. The confirm
// field is form-only (Backpack would call it a "fake" field) — it's stripped
// from the payload before hitting the API. FieldPassword provides its own
// visibility toggle per input.
import type { ChangePasswordRequest } from '~/features/auth/types'
import type { FieldDef } from '~/shared/types'

const open = defineModel<boolean>({ default: false })

const { changePassword } = useAuth()
const toast = useToast()

const fields: FieldDef[] = [
  { name: 'currentPassword', type: 'password', required: true },
  { name: 'newPassword', type: 'password', required: true, hint: 'At least 6 characters' },
  { name: 'confirmPassword', label: 'Confirm new password', type: 'password', required: true }
]

const form = ref<Record<string, any>>({})
const loading = ref(false)
const error = ref('')

watch(open, (value) => {
  if (value) {
    form.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
    error.value = ''
  }
})

async function onSubmit(values: Record<string, any>) {
  error.value = ''
  if (values.newPassword !== values.confirmPassword) {
    error.value = 'New password and confirmation do not match.'
    return
  }
  loading.value = true
  try {
    const payload: ChangePasswordRequest = {
      currentPassword: values.currentPassword,
      newPassword: values.newPassword
    }
    await changePassword(payload)
    toast.add({ title: 'Password updated', color: 'green' })
    open.value = false
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    loading.value = false
  }
}
</script>
