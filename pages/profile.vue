<template>
  <div>
    <PageHeader :title="t('auth.profile.title')" />

    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div class="lg:col-span-1 lg:sticky lg:top-20 self-start flex flex-col gap-6">
        <AppCard>
          <template #header>
            <span class="font-semibold">{{ t('auth.profile.avatarTitle') }}</span>
          </template>

          <div class="flex flex-col items-center gap-4">
            <img
              v-if="profile?.avatarUrl"
              :src="profile.avatarUrl"
              class="w-24 h-24 rounded-full object-cover shadow-sm"
              alt=""
            />
            <div
              v-else
              class="flex items-center justify-center w-24 h-24 rounded-full text-white text-2xl font-semibold uppercase shrink-0 shadow-sm"
              :class="avatarGradient(username)"
            >
              {{ username?.slice(0, 2) }}
            </div>

            <input
              ref="avatarInputRef"
              type="file"
              accept="image/*"
              class="hidden"
              @change="onPickAvatar"
            />

            <div class="flex gap-2 w-full justify-center">
              <UButton size="xs" :loading="uploadingAvatar" @click="avatarInputRef?.click()">
                {{ t('auth.profile.uploadAvatar') }}
              </UButton>
              <UButton
                v-if="profile?.avatarUrl"
                size="xs"
                color="red"
                variant="soft"
                :loading="removingAvatar"
                @click="onRemoveAvatar"
              >
                {{ t('common.remove') }}
              </UButton>
            </div>
          </div>
        </AppCard>

        <AppCard :ui="{ body: { padding: 'p-2 sm:p-2' } }">
          <nav class="flex flex-col gap-0.5">
            <button
              v-for="section in sections"
              :key="section.id"
              type="button"
              class="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-left transition-colors"
              :class="
                activeSection === section.id
                  ? 'bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
              "
              @click="goToSection(section.id)"
            >
              <UIcon :name="section.icon" class="w-4.5 h-4.5 shrink-0" />
              <span>{{ t(section.labelKey) }}</span>
            </button>
          </nav>
        </AppCard>
      </div>

      <ImageCropModal
        v-model="showCropModal"
        :file="avatarToCrop"
        :title="t('auth.profile.cropTitle')"
        @cropped="onAvatarCropped"
        @cancel="avatarToCrop = null"
      />

      <div class="lg:col-span-3 flex flex-col gap-6">
        <AppCard id="personal-info" class="scroll-mt-24">
          <template #header>
            <span class="font-semibold">{{ t('auth.profile.personalInfo') }}</span>
          </template>

          <dl class="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-sm mb-6">
            <div>
              <dt class="text-gray-500 mb-1">{{ t('auth.profile.username') }}</dt>
              <dd class="font-medium">{{ username }}</dd>
            </div>
          </dl>

          <UForm :state="emailForm" class="flex items-end gap-2 max-w-sm" @submit="onSaveEmail">
            <UFormGroup :label="t('auth.profile.email')" class="flex-1">
              <UInput
                v-model="emailForm.email"
                type="email"
                :placeholder="t('auth.profile.emailPlaceholder')"
              />
            </UFormGroup>
            <UButton type="submit" :loading="savingEmail">{{
              t('auth.profile.saveEmail')
            }}</UButton>
          </UForm>
        </AppCard>

        <AppCard id="organization" class="scroll-mt-24">
          <template #header>
            <span class="font-semibold">{{ t('auth.profile.organization') }}</span>
          </template>

          <dl class="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-sm">
            <div>
              <dt class="text-gray-500 mb-1">{{ t('auth.profile.role') }}</dt>
              <dd>
                <UBadge :color="isAdmin ? 'pink' : 'gray'" variant="subtle">{{ role }}</UBadge>
              </dd>
            </div>
            <div>
              <dt class="text-gray-500 mb-1">{{ t('auth.profile.branch') }}</dt>
              <dd class="font-medium">{{ branchName || t('auth.profile.branchNone') }}</dd>
            </div>
          </dl>
        </AppCard>

        <AppCard id="account-info" class="scroll-mt-24">
          <template #header>
            <span class="font-semibold">{{ t('auth.profile.accountInfo') }}</span>
          </template>

          <dl class="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-sm">
            <div>
              <dt class="text-gray-500 mb-1">{{ t('auth.profile.accountStatus') }}</dt>
              <dd><StatusBadge v-if="profile?.status" :status="profile.status" /></dd>
            </div>
            <div>
              <dt class="text-gray-500 mb-1">{{ t('auth.profile.memberSince') }}</dt>
              <dd class="font-medium">{{ formatDate(profile?.createdAt) }}</dd>
            </div>
            <div>
              <dt class="text-gray-500 mb-1">{{ t('auth.profile.lastUpdated') }}</dt>
              <dd class="font-medium">{{ formatDate(profile?.updatedAt) }}</dd>
            </div>
          </dl>
        </AppCard>

        <AppCard id="security" class="scroll-mt-24">
          <template #header>
            <span class="font-semibold">{{ t('auth.profile.security') }}</span>
          </template>

          <p class="text-sm text-gray-500 mb-3">{{ t('auth.profile.securityDescription') }}</p>
          <UButton variant="soft" icon="i-heroicons-key" @click="showChangePassword = true">
            {{ t('auth.changePassword') }}
          </UButton>
        </AppCard>

        <AppCard id="preferences" class="scroll-mt-24">
          <template #header>
            <span class="font-semibold">{{ t('auth.profile.preferences') }}</span>
          </template>

          <dl class="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-sm">
            <div>
              <dt class="text-gray-500 mb-1">{{ t('common.language') }}</dt>
              <dd><LanguageSwitcher /></dd>
            </div>
            <div>
              <dt class="text-gray-500 mb-1">{{ t('auth.profile.theme') }}</dt>
              <dd><ColorModeToggle /></dd>
            </div>
            <div>
              <dt class="text-gray-500 mb-1">{{ t('auth.profile.tableStyle') }}</dt>
              <dd><TableThemeSwitcher /></dd>
            </div>
            <div>
              <dt class="text-gray-500 mb-1">{{ t('auth.profile.cardStyle') }}</dt>
              <dd><CardThemeSwitcher /></dd>
            </div>
          </dl>
        </AppCard>
      </div>
    </div>

    <ChangePasswordModal v-model="showChangePassword" />
  </div>
</template>

<script setup lang="ts">
import type { UpdateProfileRequest, UserProfileResponse } from '~/features/auth/types'

const { t } = useI18n()
const api = useApi()
const toast = useToast()
const authStore = useAuth()
const { username, role, isAdmin, branchName } = storeToRefs(authStore)

const { data: profile, refresh } = await useAsyncData('my-profile', () =>
  api<UserProfileResponse>('/auth/me')
)

watch(
  profile,
  (value) => {
    if (value) authStore.applyProfile(value)
  },
  { immediate: true }
)

// ── Avatar ──────────────────────────────────────────────────────────────────
const avatarInputRef = ref<HTMLInputElement>()
const avatarToCrop = ref<File | null>(null)
const showCropModal = ref(false)
const uploadingAvatar = ref(false)
const removingAvatar = ref(false)

function onPickAvatar(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) {
    avatarToCrop.value = file
    showCropModal.value = true
  }
  // Allow re-picking the same file after cancelling.
  ;(event.target as HTMLInputElement).value = ''
}

async function onAvatarCropped(blob: Blob) {
  avatarToCrop.value = null
  uploadingAvatar.value = true
  try {
    const formData = new FormData()
    formData.append('file', blob, 'avatar.png')
    await api('/auth/me/avatar', { method: 'POST', body: formData })
    await refresh()
    toast.add({ title: t('auth.profile.avatarUpdated'), color: 'green' })
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    uploadingAvatar.value = false
  }
}

async function onRemoveAvatar() {
  removingAvatar.value = true
  try {
    await api('/auth/me/avatar', { method: 'DELETE' })
    await refresh()
    toast.add({ title: t('auth.profile.avatarRemoved'), color: 'green' })
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    removingAvatar.value = false
  }
}

// ── Email ───────────────────────────────────────────────────────────────────
const emailForm = reactive({ email: '' })
const savingEmail = ref(false)

watch(
  profile,
  (value) => {
    emailForm.email = value?.email ?? ''
  },
  { immediate: true }
)

async function onSaveEmail() {
  savingEmail.value = true
  try {
    const payload: UpdateProfileRequest = { email: emailForm.email || undefined }
    await api('/auth/me', { method: 'PUT', body: payload })
    await refresh()
    toast.add({ title: t('auth.profile.emailUpdated'), color: 'green' })
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    savingEmail.value = false
  }
}

// ── Change password ────────────────────────────────────────────────────────
const showChangePassword = ref(false)

// ── Section nav ─────────────────────────────────────────────────────────────
const sections = [
  { id: 'personal-info', icon: 'i-heroicons-user', labelKey: 'auth.profile.personalInfo' },
  {
    id: 'organization',
    icon: 'i-heroicons-building-office-2',
    labelKey: 'auth.profile.organization'
  },
  { id: 'account-info', icon: 'i-heroicons-identification', labelKey: 'auth.profile.accountInfo' },
  { id: 'security', icon: 'i-heroicons-shield-check', labelKey: 'auth.profile.security' },
  {
    id: 'preferences',
    icon: 'i-heroicons-adjustments-horizontal',
    labelKey: 'auth.profile.preferences'
  }
] as const

const activeSection = ref<string>(sections[0].id)

function goToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

let sectionObserver: IntersectionObserver | undefined

onMounted(() => {
  sectionObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      if (visible) activeSection.value = visible.target.id
    },
    { rootMargin: '-100px 0px -70% 0px' }
  )
  for (const section of sections) {
    const el = document.getElementById(section.id)
    if (el) sectionObserver.observe(el)
  }
})

onBeforeUnmount(() => {
  sectionObserver?.disconnect()
})
</script>
