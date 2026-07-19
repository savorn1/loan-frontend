<template>
  <UForm :state="form" class="space-y-4" @submit="() => emit('submit', { ...form })">
    <div class="grid grid-cols-2 gap-4">
      <UFormGroup label="First name" name="firstName" required>
        <UInput v-model="form.firstName" required />
      </UFormGroup>
      <UFormGroup label="Last name" name="lastName" required>
        <UInput v-model="form.lastName" required />
      </UFormGroup>
    </div>
    <UFormGroup label="Email" name="email" required>
      <UInput v-model="form.email" type="email" icon="i-heroicons-envelope" required />
    </UFormGroup>
    <div class="grid grid-cols-2 gap-4">
      <UFormGroup label="Phone" name="phone">
        <UInput v-model="form.phone" icon="i-heroicons-phone" />
      </UFormGroup>
      <UFormGroup label="National ID" name="nationalId">
        <UInput v-model="form.nationalId" icon="i-heroicons-identification" />
      </UFormGroup>
    </div>
    <UFormGroup label="Address" name="address">
      <UInput v-model="form.address" icon="i-heroicons-map-pin" />
    </UFormGroup>
    <UFormGroup label="Date of birth" name="dateOfBirth">
      <UInput v-model="form.dateOfBirth" type="date" icon="i-heroicons-cake" />
    </UFormGroup>
    <div class="flex justify-end gap-2 pt-2">
      <UButton type="submit" :loading="loading">{{ submitLabel }}</UButton>
    </div>
  </UForm>
</template>

<script setup lang="ts">
import type { CustomerRequest } from '~/features/customers/types'

const props = defineProps<{
  initial?: Partial<CustomerRequest>
  loading?: boolean
  submitLabel?: string
}>()

const emit = defineEmits<{ submit: [CustomerRequest] }>()

const form = reactive<CustomerRequest>({
  firstName: props.initial?.firstName ?? '',
  lastName: props.initial?.lastName ?? '',
  email: props.initial?.email ?? '',
  phone: props.initial?.phone ?? '',
  nationalId: props.initial?.nationalId ?? '',
  address: props.initial?.address ?? '',
  dateOfBirth: props.initial?.dateOfBirth ?? ''
})

const submitLabel = computed(() => props.submitLabel ?? 'Save')
</script>
