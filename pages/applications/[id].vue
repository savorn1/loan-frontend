<template>
  <div v-if="application">
    <UButton
      to="/applications"
      variant="link"
      icon="i-heroicons-arrow-left"
      size="xs"
      class="mb-1 px-0"
    >
      {{ t('applications.detail.backToApplications') }}
    </UButton>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div class="flex items-center gap-3 min-w-0">
        <div>
          <h1 class="text-xl font-bold">
            {{ t('applications.detail.title', { id: application.id }) }}
          </h1>
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ application.applicationNo }}</p>
        </div>
        <StatusBadge :status="application.status" />
      </div>
      <div v-if="isAdmin" class="flex flex-wrap gap-2">
        <UButton v-if="application.status === 'SUBMITTED'" variant="soft" @click="onStartReview">{{
          t('applications.detail.startReview')
        }}</UButton>
        <UButton
          v-if="application.status === 'SUBMITTED' || application.status === 'UNDER_REVIEW'"
          color="green"
          @click="openDecision('APPROVED')"
        >
          {{ t('applications.detail.approve') }}
        </UButton>
        <UButton
          v-if="application.status === 'SUBMITTED' || application.status === 'UNDER_REVIEW'"
          color="red"
          variant="soft"
          @click="openDecision('REJECTED')"
        >
          {{ t('applications.detail.reject') }}
        </UButton>
      </div>
      <UButton
        v-else-if="application.status === 'SUBMITTED' || application.status === 'UNDER_REVIEW'"
        color="gray"
        variant="soft"
        @click="confirmWithdraw = true"
      >
        {{ t('applications.detail.withdraw') }}
      </UButton>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      <UCard class="lg:col-span-1">
        <template #header>
          <span class="font-semibold">{{ t('applications.detail.details') }}</span>
        </template>
        <dl class="grid grid-cols-2 gap-y-3 text-sm">
          <dt class="text-gray-500">{{ t('applications.detail.customer') }}</dt>
          <dd>
            <NuxtLink :to="`/customers/${application.customerId}`" class="text-primary-500">{{
              application.customerName
            }}</NuxtLink>
          </dd>
          <dt class="text-gray-500">{{ t('applications.detail.loanProduct') }}</dt>
          <dd>{{ application.loanProductName || '—' }}</dd>
          <dt class="text-gray-500">{{ t('applications.detail.requestedAmount') }}</dt>
          <dd>{{ formatCurrency(application.requestedAmount) }}</dd>
          <dt class="text-gray-500">{{ t('applications.detail.requestedTerm') }}</dt>
          <dd>{{ application.requestedTermMonths }} {{ t('applications.detail.monthsUnit') }}</dd>
          <dt class="text-gray-500">{{ t('applications.detail.purpose') }}</dt>
          <dd>{{ application.purpose || '—' }}</dd>
          <dt class="text-gray-500">{{ t('applications.detail.submitted') }}</dt>
          <dd>{{ formatDateTime(application.submittedAt) }}</dd>
          <dt class="text-gray-500">{{ t('applications.detail.decided') }}</dt>
          <dd>{{ formatDateTime(application.decidedAt) }}</dd>
          <dt class="text-gray-500">{{ t('applications.detail.loan') }}</dt>
          <dd>
            <NuxtLink
              v-if="application.loanId"
              :to="`/loans/${application.loanId}`"
              class="text-primary-500"
            >
              #{{ application.loanId }}
            </NuxtLink>
            <span v-else>—</span>
          </dd>
        </dl>
      </UCard>

      <UCard class="lg:col-span-2">
        <template #header>
          <span class="font-semibold">{{ t('applications.detail.decisions') }}</span>
        </template>
        <ol v-if="application.approvals.length" class="space-y-4">
          <li
            v-for="a in sortedApprovals"
            :key="a.id"
            class="border-b border-gray-100 dark:border-gray-800 pb-3 last:border-0 last:pb-0"
          >
            <div class="flex items-center gap-2">
              <StatusBadge :status="a.decision" />
              <span v-if="a.decision === 'APPROVED'" class="text-sm text-gray-500">
                {{ formatCurrency(a.approvedAmount) }} · {{ a.approvedInterestRate }}% ·
                {{ a.approvedTermMonths }} mo
              </span>
            </div>
            <p v-if="a.comments" class="text-sm mt-1 whitespace-pre-wrap">{{ a.comments }}</p>
            <p class="text-xs text-gray-500 mt-1">
              {{ a.approverName }} · {{ formatDateTime(a.decidedAt) }}
            </p>
          </li>
        </ol>
        <EmptyState
          v-else
          icon="i-heroicons-scale"
          :title="t('applications.detail.noDecisionsTitle')"
          :description="t('applications.detail.noDecisionsDescription')"
        />
      </UCard>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <UCard>
        <template #header>
          <span class="font-semibold">{{ t('applications.detail.documents') }}</span>
        </template>

        <UForm :state="documentForm" class="space-y-3 mb-6" @submit="onUploadDocument">
          <UInput
            v-model="documentForm.documentType"
            :placeholder="t('applications.detail.documentTypePlaceholder')"
          />
          <FileUpload
            v-model="documentForm.files"
            multiple
            :max-size-mb="10"
            :disabled="uploadingDocument"
          />
          <div class="flex justify-end">
            <UButton
              type="submit"
              size="xs"
              :loading="uploadingDocument"
              :disabled="!canUploadDocument"
              >{{ t('applications.detail.uploadDocument') }}</UButton
            >
          </div>
        </UForm>

        <ul v-if="application.documents.length" class="space-y-3">
          <li
            v-for="d in application.documents"
            :key="d.id"
            class="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800 pb-3 last:border-0 last:pb-0"
          >
            <div class="min-w-0">
              <a
                :href="d.fileUrl"
                target="_blank"
                rel="noopener"
                class="text-sm font-medium truncate block text-primary-500 hover:underline"
              >
                {{ d.fileName }}
              </a>
              <p class="text-xs text-gray-500">
                {{ d.documentType }} · {{ formatDateTime(d.uploadedAt) }}
              </p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <StatusBadge :status="d.status" />
              <template v-if="isAdmin">
                <UButton
                  v-if="d.status === 'PENDING'"
                  size="2xs"
                  variant="soft"
                  icon="i-heroicons-check"
                  :aria-label="t('applications.detail.verifyDocument')"
                  @click="onVerifyDocument(d.id)"
                />
                <UButton
                  v-if="d.status === 'PENDING'"
                  size="2xs"
                  color="red"
                  variant="soft"
                  icon="i-heroicons-x-mark"
                  :aria-label="t('applications.detail.rejectDocument')"
                  @click="onRejectDocument(d.id)"
                />
                <UButton
                  size="2xs"
                  color="red"
                  variant="ghost"
                  icon="i-heroicons-trash"
                  :aria-label="t('applications.detail.deleteDocument')"
                  @click="onDeleteDocument(d.id)"
                />
              </template>
            </div>
          </li>
        </ul>
        <EmptyState
          v-else
          icon="i-heroicons-document"
          :title="t('applications.detail.noDocumentsTitle')"
          :description="t('applications.detail.noDocumentsDescription')"
        />
      </UCard>

      <UCard>
        <template #header>
          <span class="font-semibold">{{ t('applications.detail.notes') }}</span>
        </template>

        <UForm :state="noteForm" class="flex items-start gap-2 mb-6" @submit="onAddNote">
          <UTextarea
            v-model="noteForm.note"
            :rows="2"
            :placeholder="t('applications.detail.notePlaceholder')"
            class="flex-1"
            required
          />
          <UButton type="submit" :loading="addingNote" :disabled="!noteForm.note.trim()">{{
            t('applications.detail.add')
          }}</UButton>
        </UForm>

        <ol v-if="application.notes.length" class="space-y-4">
          <li
            v-for="n in sortedNotes"
            :key="n.id"
            class="border-b border-gray-100 dark:border-gray-800 pb-3 last:border-0 last:pb-0"
          >
            <p class="text-sm whitespace-pre-wrap">{{ n.note }}</p>
            <p class="text-xs text-gray-500 mt-1">
              {{ n.authorName }} · {{ formatDateTime(n.createdAt) }}
            </p>
          </li>
        </ol>
        <EmptyState
          v-else
          icon="i-heroicons-chat-bubble-left-right"
          :title="t('applications.detail.noNotesTitle')"
          :description="t('applications.detail.noNotesDescription')"
        />
      </UCard>
    </div>

    <UModal v-model="showDecision">
      <UCard>
        <template #header>
          <span class="font-semibold">{{
            decisionForm.decision === 'APPROVED'
              ? t('applications.detail.approveModalTitle')
              : t('applications.detail.rejectModalTitle')
          }}</span>
        </template>
        <UForm :state="decisionForm" class="space-y-4" @submit="onDecide">
          <template v-if="decisionForm.decision === 'APPROVED'">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <UFormGroup :label="t('applications.detail.approvedAmount')" required>
                <UInput
                  v-model.number="decisionForm.approvedAmount"
                  type="number"
                  min="1000"
                  step="0.01"
                />
              </UFormGroup>
              <UFormGroup :label="t('applications.detail.interestRate')" required>
                <UInput
                  v-model.number="decisionForm.approvedInterestRate"
                  type="number"
                  min="0.01"
                  max="100"
                  step="0.01"
                />
              </UFormGroup>
              <UFormGroup :label="t('applications.detail.termMonths')" required>
                <UInput
                  v-model.number="decisionForm.approvedTermMonths"
                  type="number"
                  min="1"
                  max="360"
                />
              </UFormGroup>
            </div>
          </template>
          <UFormGroup :label="t('applications.detail.comments')">
            <UTextarea v-model="decisionForm.comments" />
          </UFormGroup>
          <UAlert v-if="decisionError" color="red" variant="subtle" :title="decisionError" />
          <div class="flex justify-end gap-2 pt-2">
            <UButton color="gray" variant="ghost" @click="showDecision = false">{{
              t('common.cancel')
            }}</UButton>
            <UButton
              type="submit"
              :color="decisionForm.decision === 'APPROVED' ? 'primary' : 'red'"
              :loading="deciding"
            >
              {{
                decisionForm.decision === 'APPROVED'
                  ? t('applications.detail.approve')
                  : t('applications.detail.reject')
              }}
            </UButton>
          </div>
        </UForm>
      </UCard>
    </UModal>

    <ConfirmModal
      v-model="confirmWithdraw"
      :title="t('applications.detail.withdrawTitle')"
      :description="t('applications.detail.withdrawDescription')"
      :confirm-label="t('applications.detail.withdraw')"
      color="red"
      :loading="withdrawing"
      @confirm="onWithdraw"
    />
  </div>
  <div v-else-if="error" class="py-8">
    <ErrorState :title="t('common.errorState.title')" :description="apiErrorMessage(error)">
      <template #action>
        <UButton
          size="sm"
          variant="soft"
          icon="i-heroicons-arrow-path"
          :loading="pending"
          @click="refresh()"
        >
          {{ t('common.errorState.retry') }}
        </UButton>
      </template>
    </ErrorState>
  </div>
  <div v-else class="flex justify-center py-16">
    <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-gray-400" />
  </div>
</template>

<script setup lang="ts">
import type {
  ApplicationApprovalRequest,
  ApplicationNoteRequest,
  ApplicationResponse,
  ApprovalDecision
} from '~/features/loans/types'

const { t } = useI18n()
const route = useRoute()
const api = useApi()
const toast = useToast()
const { isAdmin } = storeToRefs(useAuth())

const applicationId = route.params.id as string

const {
  data: application,
  error,
  pending,
  refresh
} = await useAsyncData(`application-${applicationId}`, () =>
  api<ApplicationResponse>(`/loans/applications/${applicationId}`)
)

const sortedNotes = computed(() =>
  [...(application.value?.notes ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
)
const sortedApprovals = computed(() =>
  [...(application.value?.approvals ?? [])].sort(
    (a, b) => new Date(b.decidedAt).getTime() - new Date(a.decidedAt).getTime()
  )
)

// ── Start review / withdraw ────────────────────────────────────────────────
async function onStartReview() {
  try {
    await api(`/loans/applications/${applicationId}/start-review`, { method: 'PUT' })
    toast.add({ title: t('applications.detail.toastUnderReview'), color: 'green' })
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  }
}

const confirmWithdraw = ref(false)
const withdrawing = ref(false)
async function onWithdraw() {
  withdrawing.value = true
  try {
    await api(`/loans/applications/${applicationId}/withdraw`, { method: 'PUT' })
    toast.add({ title: t('applications.detail.toastWithdrawn'), color: 'green' })
    confirmWithdraw.value = false
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    withdrawing.value = false
  }
}

// ── Approve / reject decision ──────────────────────────────────────────────
const showDecision = ref(false)
const deciding = ref(false)
const decisionError = ref('')
const decisionForm = reactive<{
  decision: ApprovalDecision
  approvedAmount?: number
  approvedInterestRate?: number
  approvedTermMonths?: number
  comments: string
}>({
  decision: 'APPROVED',
  approvedAmount: undefined,
  approvedInterestRate: undefined,
  approvedTermMonths: undefined,
  comments: ''
})

function openDecision(decision: ApprovalDecision) {
  decisionForm.decision = decision
  decisionForm.approvedAmount = application.value?.requestedAmount
  decisionForm.approvedInterestRate = undefined
  decisionForm.approvedTermMonths = application.value?.requestedTermMonths
  decisionForm.comments = ''
  decisionError.value = ''
  showDecision.value = true
}

async function onDecide() {
  if (
    decisionForm.decision === 'APPROVED' &&
    (!decisionForm.approvedAmount ||
      !decisionForm.approvedInterestRate ||
      !decisionForm.approvedTermMonths)
  ) {
    decisionError.value = t('applications.detail.decisionValidationError')
    return
  }
  deciding.value = true
  decisionError.value = ''
  try {
    const payload: ApplicationApprovalRequest = {
      decision: decisionForm.decision,
      approvedAmount:
        decisionForm.decision === 'APPROVED' ? decisionForm.approvedAmount : undefined,
      approvedInterestRate:
        decisionForm.decision === 'APPROVED' ? decisionForm.approvedInterestRate : undefined,
      approvedTermMonths:
        decisionForm.decision === 'APPROVED' ? decisionForm.approvedTermMonths : undefined,
      comments: decisionForm.comments || undefined
    }
    await api(`/loans/applications/${applicationId}/approvals`, { method: 'POST', body: payload })
    toast.add({
      title:
        decisionForm.decision === 'APPROVED'
          ? t('applications.detail.toastApproved')
          : t('applications.detail.toastRejected'),
      color: 'green'
    })
    showDecision.value = false
    await refresh()
  } catch (err) {
    decisionError.value = apiErrorMessage(err)
  } finally {
    deciding.value = false
  }
}

// ── Documents ───────────────────────────────────────────────────────────────
const uploadingDocument = ref(false)
const documentForm = reactive<{ documentType: string; files: File[] }>({
  documentType: '',
  files: []
})
const canUploadDocument = computed(
  () => documentForm.documentType.trim() && documentForm.files.length > 0
)

async function onUploadDocument() {
  if (!canUploadDocument.value) return
  uploadingDocument.value = true
  const documentType = documentForm.documentType.trim()
  const failed: string[] = []
  try {
    // Backend takes one file per request, so a multi-file selection uploads
    // sequentially, all tagged with the same documentType.
    for (const file of documentForm.files) {
      try {
        const formData = new FormData()
        formData.append('documentType', documentType)
        formData.append('file', file)
        await api(`/loans/applications/${applicationId}/documents/upload`, {
          method: 'POST',
          body: formData
        })
      } catch (err) {
        failed.push(`${file.name}: ${apiErrorMessage(err)}`)
      }
    }
    if (failed.length) {
      toast.add({ title: failed.join('; '), color: 'red' })
    }
    if (failed.length < documentForm.files.length) {
      documentForm.documentType = ''
      documentForm.files = []
    }
    await refresh()
  } finally {
    uploadingDocument.value = false
  }
}

async function onVerifyDocument(documentId: number) {
  try {
    await api(`/loans/applications/${applicationId}/documents/${documentId}/verify`, {
      method: 'PUT'
    })
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  }
}

async function onRejectDocument(documentId: number) {
  try {
    await api(`/loans/applications/${applicationId}/documents/${documentId}/reject`, {
      method: 'PUT'
    })
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  }
}

async function onDeleteDocument(documentId: number) {
  try {
    await api(`/loans/applications/${applicationId}/documents/${documentId}`, { method: 'DELETE' })
    toast.add({ title: t('applications.detail.toastDocumentDeleted'), color: 'green' })
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  }
}

// ── Notes ────────────────────────────────────────────────────────────────────
const addingNote = ref(false)
const noteForm = reactive({ note: '' })

async function onAddNote() {
  if (!noteForm.note.trim()) return
  addingNote.value = true
  try {
    const payload: ApplicationNoteRequest = { note: noteForm.note.trim() }
    await api(`/loans/applications/${applicationId}/notes`, { method: 'POST', body: payload })
    noteForm.note = ''
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    addingNote.value = false
  }
}
</script>
