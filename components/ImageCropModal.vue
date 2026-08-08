<template>
  <UModal v-model="open" :ui="{ width: 'sm:max-w-lg' }">
    <UCard>
      <template #header>
        <span class="font-semibold">{{ title ?? t('common.cropImage') }}</span>
      </template>

      <ClientOnly>
        <div class="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
          <Cropper
            v-if="imageSrc"
            ref="cropperRef"
            class="cropper flex-1 min-w-0"
            :src="imageSrc"
            :stencil-component="CircleStencil"
            :stencil-props="{ aspectRatio: 1 }"
            @change="onCropperChange"
          />
          <div class="shrink-0 flex flex-col items-center gap-1">
            <div
              class="w-20 h-20 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700"
            >
              <Preview
                v-if="cropResult"
                :width="80"
                :height="80"
                :image="cropResult.image"
                :coordinates="cropResult.coordinates"
              />
            </div>
            <span class="text-xs text-gray-500">{{ t('common.preview') }}</span>
          </div>
        </div>
      </ClientOnly>

      <div class="flex justify-end gap-2 pt-4">
        <UButton color="gray" variant="ghost" @click="onCancel">{{ t('common.cancel') }}</UButton>
        <UButton :loading="cropping" @click="onConfirm">{{ t('common.save') }}</UButton>
      </div>
    </UCard>
  </UModal>
</template>

<script setup lang="ts">
import { Cropper, CircleStencil, Preview } from 'vue-advanced-cropper'
import type { CropperResult } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'

// Crops the picked File to a fixed 1:1 square (CircleStencil frames it as a
// circle since every caller today is an avatar, but the exported blob is a
// plain square PNG — cropping, not clipping to a circular alpha mask).
const props = defineProps<{
  file: File | null
  title?: string
}>()

const emit = defineEmits<{
  cropped: [blob: Blob]
  cancel: []
}>()

const open = defineModel<boolean>({ default: false })

const { t } = useI18n()

const cropperRef = ref<InstanceType<typeof Cropper>>()
const cropping = ref(false)
const imageSrc = ref<string | null>(null)
const cropResult = ref<CropperResult | null>(null)

watch(
  () => props.file,
  (file) => {
    if (imageSrc.value) URL.revokeObjectURL(imageSrc.value)
    imageSrc.value = file ? URL.createObjectURL(file) : null
    cropResult.value = null
  },
  { immediate: true }
)

function onCropperChange(result: CropperResult) {
  cropResult.value = result
}

onBeforeUnmount(() => {
  if (imageSrc.value) URL.revokeObjectURL(imageSrc.value)
})

function onCancel() {
  open.value = false
  emit('cancel')
}

async function onConfirm() {
  const result = cropperRef.value?.getResult()
  if (!result?.canvas) {
    onCancel()
    return
  }
  cropping.value = true
  try {
    const blob = await new Promise<Blob | null>((resolve) =>
      result.canvas!.toBlob(resolve, 'image/png')
    )
    if (blob) emit('cropped', blob)
    open.value = false
  } finally {
    cropping.value = false
  }
}
</script>

<style scoped>
.cropper {
  max-height: 24rem;
  background: #f3f4f6;
}
</style>
