<template>
  <div class="space-y-3">
    <div
      class="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors"
      :class="[
        disabled
          ? 'cursor-not-allowed opacity-60 border-gray-200 dark:border-gray-700'
          : isDragging
            ? 'cursor-pointer border-primary-400 bg-primary-50 dark:bg-primary-400/10'
            : 'cursor-pointer border-gray-300 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-400/50'
      ]"
      @click="!disabled && inputRef?.click()"
      @dragover.prevent="onDragOver"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="onDrop"
    >
      <UIcon :name="icon" class="w-8 h-8 text-gray-400 dark:text-gray-500" />
      <p class="text-sm text-gray-600 dark:text-gray-300">
        <span class="font-medium text-primary-500">{{ t('fileUpload.clickToUpload') }}</span>
        {{ t('fileUpload.orDragAndDrop') }}
      </p>
      <p v-if="hintText" class="text-xs text-gray-400 dark:text-gray-500">{{ hintText }}</p>
      <input
        ref="inputRef"
        type="file"
        class="hidden"
        :accept="accept"
        :multiple="multiple"
        :disabled="disabled"
        @change="onChange"
        @click.stop
      />
    </div>

    <UAlert v-if="error" color="red" variant="subtle" :title="error" />

    <ul v-if="files.length" class="space-y-2">
      <li
        v-for="(file, index) in files"
        :key="`${file.name}-${file.lastModified}-${index}`"
        class="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2"
      >
        <img
          v-if="previewUrls[index]"
          :src="previewUrls[index]"
          class="w-10 h-10 rounded object-cover shrink-0"
          alt=""
        />
        <UIcon v-else name="i-heroicons-document" class="w-8 h-8 text-gray-400 shrink-0" />
        <div class="min-w-0 flex-1">
          <p class="text-sm text-gray-900 dark:text-white truncate">{{ file.name }}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">{{ formatBytes(file.size) }}</p>
        </div>
        <UButton
          size="2xs"
          color="gray"
          variant="ghost"
          icon="i-heroicons-x-mark"
          :disabled="disabled"
          @click="removeAt(index)"
        />
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
// Generic file/image picker: click-to-browse + drag-and-drop, single or
// multiple, with thumbnail previews for image files. v-model is a bare
// File (single mode) or File[] (multiple mode) — this component only
// collects the selection; callers own the actual upload call.
const props = withDefaults(
  defineProps<{
    multiple?: boolean
    /** Native file input + drop-target restriction, e.g. 'image/*'. */
    accept?: string
    maxSizeMb?: number
    disabled?: boolean
    hint?: string
    icon?: string
  }>(),
  {
    multiple: false,
    accept: undefined,
    maxSizeMb: undefined,
    disabled: false,
    hint: undefined,
    icon: 'i-heroicons-cloud-arrow-up'
  }
)

const model = defineModel<File | File[] | null>({ default: null })
const { t } = useI18n()

const inputRef = ref<HTMLInputElement>()
const isDragging = ref(false)
const error = ref('')

const files = computed<File[]>(() => {
  if (!model.value) return []
  return Array.isArray(model.value) ? model.value : [model.value]
})

const hintText = computed(
  () => props.hint ?? (props.maxSizeMb ? t('fileUpload.upToSize', { size: props.maxSizeMb }) : undefined)
)

// Thumbnails for image files only; revoked whenever the selection changes so
// we don't leak object URLs for files the user has already removed.
const previewUrls = ref<(string | undefined)[]>([])

watch(
  files,
  (list) => {
    previewUrls.value.forEach((url) => url && URL.revokeObjectURL(url))
    previewUrls.value = list.map((file) =>
      file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
    )
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  previewUrls.value.forEach((url) => url && URL.revokeObjectURL(url))
})

function onDragOver() {
  if (!props.disabled) isDragging.value = true
}

function addFiles(list: FileList | File[]) {
  error.value = ''
  const incoming = Array.from(list)
  if (props.maxSizeMb) {
    const tooBig = incoming.find((file) => file.size > props.maxSizeMb! * 1024 * 1024)
    if (tooBig) {
      error.value = t('fileUpload.exceedsLimit', { name: tooBig.name, size: props.maxSizeMb })
      return
    }
  }
  model.value = props.multiple ? [...files.value, ...incoming] : (incoming[0] ?? null)
}

function onChange(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files?.length) addFiles(target.files)
  // Allow re-selecting the same file after it's been removed.
  target.value = ''
}

function onDrop(event: DragEvent) {
  isDragging.value = false
  if (props.disabled) return
  if (event.dataTransfer?.files?.length) addFiles(event.dataTransfer.files)
}

function removeAt(index: number) {
  model.value = props.multiple ? files.value.filter((_, i) => i !== index) : null
}
</script>
