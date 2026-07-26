<template>
  <div class="space-y-2">
    <div v-if="model" class="flex items-center gap-3">
      <img :src="model" class="w-16 h-16 rounded object-cover border border-gray-200 dark:border-gray-700" alt="" />
      <UButton
        size="xs"
        color="gray"
        variant="soft"
        icon="i-heroicons-x-mark"
        :disabled="field.disabled"
        @click="clear"
      >
        Remove
      </UButton>
    </div>
    <div v-else>
      <input
        ref="inputRef"
        type="file"
        accept="image/*"
        class="hidden"
        :disabled="field.disabled"
        @change="onChange"
      />
      <UButton
        size="xs"
        color="gray"
        variant="soft"
        icon="i-heroicons-photo"
        :disabled="field.disabled"
        @click="inputRef?.click()"
      >
        Upload image
      </UButton>
    </div>

    <UAlert v-if="error" color="red" variant="subtle" :title="error" />
  </div>
</template>

<script setup lang="ts">
// Backpack's base64_image field: encodes the selected image straight to a
// base64 data URL and stores that string in the model, for APIs that embed
// the image inline in JSON rather than accepting a multipart upload — unlike
// FieldImage/FileUpload, whose model is a File for a separate upload call.
import type { FieldDef } from '~/shared/types'

const props = defineProps<{ field: FieldDef }>()
const model = defineModel<any>()

const inputRef = ref<HTMLInputElement>()
const error = ref('')

function onChange(event: Event) {
  error.value = ''
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (props.field.maxSizeMb && file.size > props.field.maxSizeMb * 1024 * 1024) {
    error.value = `"${file.name}" exceeds the ${props.field.maxSizeMb}MB limit`
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    model.value = reader.result as string
  }
  reader.readAsDataURL(file)
}

function clear() {
  model.value = ''
  if (inputRef.value) inputRef.value.value = ''
}
</script>
