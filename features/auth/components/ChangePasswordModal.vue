<template>
  <UModal v-model="open">
    <UCard>
      <template #header>
        <span class="font-semibold">{{ t('auth.changePassword') }}</span>
      </template>
      <DynamicForm
        v-model="form"
        :fields="fields"
        :loading="loading"
        :error="error"
        :submit-label="t('auth.updatePassword')"
        cancelable
        @submit="onSubmit"
        @cancel="open = false"
      />
    </UCard>
  </UModal>
</template>

<script setup lang="ts">

import type { ChangePasswordRequest } from '~/features/auth/types'
import type { FieldDef } from '~/shared/types'

const open = defineModel<boolean>({ default: false })

const { t } = useI18n()
const { changePassword } = useAuth()
const toast = useToast()

const fields = computed<FieldDef[]>(() => [
  { name: 'currentPassword', label: t('auth.currentPassword'), type: 'password', required: true },
  {
    name: 'newPassword',
    label: t('auth.newPassword'),
    type: 'password',
    required: true,
    hint: t('auth.newPasswordHint')
  },
  {
    name: 'confirmPassword',
    label: t('auth.confirmNewPassword'),
    type: 'password',
    required: true
  }
])

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
    error.value = t('auth.newPasswordMismatch')
    return
  }
  loading.value = true
  try {
    const payload: ChangePasswordRequest = {
      currentPassword: values.currentPassword,
      newPassword: values.newPassword
    }
    await changePassword(payload)
    toast.add({ title: t('auth.passwordUpdated'), color: 'green' })
    open.value = false
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    loading.value = false
  }
}
</script>
