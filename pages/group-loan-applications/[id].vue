<template>
  <div v-if="application">
    <UButton
      to="/group-loan-applications"
      variant="link"
      icon="i-heroicons-arrow-left"
      size="xs"
      class="mb-1 px-0"
    >
      {{ t('groupLoanApplications.detail.backToList') }}
    </UButton>
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <div>
          <h1 class="text-xl font-bold">
            {{ t('groupLoanApplications.detail.title', { id: application.id }) }}
          </h1>
          <p v-if="application.applicationNo" class="text-sm text-gray-500 dark:text-gray-400">
            {{ application.applicationNo }}
          </p>
        </div>
        <StatusBadge :status="application.status" />
      </div>
      <div v-if="isAdmin" class="flex gap-2">
        <UButton v-if="application.status === 'SUBMITTED'" variant="soft" @click="onStartReview">{{
          t('groupLoanApplications.detail.startReview')
        }}</UButton>
        <UButton
          v-if="application.status === 'SUBMITTED' || application.status === 'UNDER_REVIEW'"
          color="green"
          @click="openDecision('APPROVED')"
        >
          {{ t('groupLoanApplications.detail.approve') }}
        </UButton>
        <UButton
          v-if="application.status === 'SUBMITTED' || application.status === 'UNDER_REVIEW'"
          color="red"
          variant="soft"
          @click="openDecision('REJECTED')"
        >
          {{ t('groupLoanApplications.detail.reject') }}
        </UButton>
      </div>
      <UButton
        v-else-if="application.status === 'SUBMITTED' || application.status === 'UNDER_REVIEW'"
        color="gray"
        variant="soft"
        @click="confirmCancel = true"
      >
        {{ t('groupLoanApplications.detail.cancel') }}
      </UButton>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <UCard>
        <template #header>
          <span class="font-semibold">{{ t('groupLoanApplications.detail.details') }}</span>
        </template>
        <dl class="grid grid-cols-2 gap-y-3 text-sm">
          <dt class="text-gray-500">{{ t('groupLoanApplications.detail.group') }}</dt>
          <dd>
            <NuxtLink :to="`/groups/${application.groupId}`" class="text-primary-500">{{
              application.groupName
            }}</NuxtLink>
          </dd>
          <dt class="text-gray-500">{{ t('groupLoanApplications.detail.purpose') }}</dt>
          <dd>{{ application.purpose || '—' }}</dd>
          <dt class="text-gray-500">{{ t('groupLoanApplications.detail.submitted') }}</dt>
          <dd>{{ formatDateTime(application.submittedAt) }}</dd>
          <dt class="text-gray-500">{{ t('groupLoanApplications.detail.decided') }}</dt>
          <dd>{{ formatDateTime(application.decidedAt) }}</dd>
        </dl>
      </UCard>

      <UCard>
        <template #header>
          <span class="font-semibold">{{ t('groupLoanApplications.detail.membersHeader') }}</span>
        </template>
        <DataTable :rows="application.members" :columns="memberColumns" :exportable="false">
          <template #loanId-data="{ row }">
            <NuxtLink
              v-if="row.loanId"
              :to="`/loans/${row.loanId}`"
              class="text-primary-500 font-medium"
            >
              #{{ row.loanId }}
            </NuxtLink>
            <span v-else>—</span>
          </template>
        </DataTable>
      </UCard>
    </div>

    <UCard>
      <template #header>
        <span class="font-semibold">{{ t('groupLoanApplications.detail.documents') }}</span>
      </template>

      <UForm :state="documentForm" class="space-y-3 mb-6" @submit="onUploadDocument">
        <UInput
          v-model="documentForm.documentType"
          :placeholder="t('groupLoanApplications.detail.documentTypePlaceholder')"
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
            >{{ t('groupLoanApplications.detail.uploadDocument') }}</UButton
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
                :aria-label="t('groupLoanApplications.detail.verifyDocument')"
                @click="onVerifyDocument(d.id)"
              />
              <UButton
                v-if="d.status === 'PENDING'"
                size="2xs"
                color="red"
                variant="soft"
                icon="i-heroicons-x-mark"
                :aria-label="t('groupLoanApplications.detail.rejectDocument')"
                @click="onRejectDocument(d.id)"
              />
              <UButton
                size="2xs"
                color="red"
                variant="ghost"
                icon="i-heroicons-trash"
                :aria-label="t('groupLoanApplications.detail.deleteDocument')"
                @click="onDeleteDocument(d.id)"
              />
            </template>
          </div>
        </li>
      </ul>
      <EmptyState
        v-else
        icon="i-heroicons-document"
        :title="t('groupLoanApplications.detail.noDocumentsTitle')"
        :description="t('groupLoanApplications.detail.noDocumentsDescription')"
      />
    </UCard>

    <UModal v-model="showDecision">
      <UCard>
        <template #header>
          <span class="font-semibold">{{
            decisionForm.decision === 'APPROVED'
              ? t('groupLoanApplications.detail.approveModalTitle')
              : t('groupLoanApplications.detail.rejectModalTitle')
          }}</span>
        </template>
        <UForm :state="decisionForm" class="space-y-4" @submit="onDecide">
          <template v-if="decisionForm.decision === 'APPROVED'">
            <div class="space-y-3">
              <div
                v-for="m in decisionForm.members"
                :key="m.customerId"
                class="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end border-b border-gray-100 dark:border-gray-800 pb-3 last:border-0"
              >
                <p class="text-sm font-medium sm:col-span-1 truncate">{{ m.customerName }}</p>
                <UFormGroup :label="t('groupLoanApplications.detail.approvedAmount')" required>
                  <UInput v-model.number="m.approvedAmount" type="number" min="1000" step="0.01" />
                </UFormGroup>
                <UFormGroup :label="t('groupLoanApplications.detail.interestRate')" required>
                  <UInput
                    v-model.number="m.approvedInterestRate"
                    type="number"
                    min="0.01"
                    max="100"
                    step="0.01"
                  />
                </UFormGroup>
                <UFormGroup :label="t('groupLoanApplications.detail.termMonths')" required>
                  <UInput v-model.number="m.approvedTermMonths" type="number" min="1" max="360" />
                </UFormGroup>
              </div>
            </div>
          </template>
          <UFormGroup :label="t('groupLoanApplications.detail.comments')">
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
                  ? t('groupLoanApplications.detail.approve')
                  : t('groupLoanApplications.detail.reject')
              }}
            </UButton>
          </div>
        </UForm>
      </UCard>
    </UModal>

    <ConfirmModal
      v-model="confirmCancel"
      :title="t('groupLoanApplications.detail.cancelTitle')"
      :description="t('groupLoanApplications.detail.cancelDescription')"
      :confirm-label="t('groupLoanApplications.detail.cancel')"
      color="red"
      :loading="cancelling"
      @confirm="onCancel"
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
  GroupLoanApplicationApprovalRequest,
  GroupLoanApplicationResponse,
  GroupLoanApprovalDecision,
  GroupLoanApprovalMemberDecision,
  GroupLoanMemberLine
} from '~/features/groups/types'
import type { ColumnDef } from '~/shared/types'

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
} = await useAsyncData(`group-loan-application-${applicationId}`, () =>
  api<GroupLoanApplicationResponse>(`/group-loan-applications/${applicationId}`)
)

const memberColumns = computed<ColumnDef<GroupLoanMemberLine>[]>(() => [
  { key: 'customerName', label: t('groupLoanApplications.detail.memberColumn') },
  {
    key: 'requestedAmount',
    label: t('groupLoanApplications.detail.requestedColumn'),
    type: 'currency'
  },
  { key: 'requestedTermMonths', label: t('groupLoanApplications.detail.termColumn') },
  {
    key: 'approvedAmount',
    label: t('groupLoanApplications.detail.approvedColumn'),
    type: 'currency'
  },
  { key: 'loanId', label: t('groupLoanApplications.detail.loanColumn') }
])

// ── Start review / cancel ────────────────────────────────────────────────
async function onStartReview() {
  try {
    await api(`/group-loan-applications/${applicationId}/start-review`, { method: 'PUT' })
    toast.add({ title: t('groupLoanApplications.detail.toastUnderReview'), color: 'green' })
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  }
}

const confirmCancel = ref(false)
const cancelling = ref(false)
async function onCancel() {
  cancelling.value = true
  try {
    await api(`/group-loan-applications/${applicationId}/cancel`, { method: 'PUT' })
    toast.add({ title: t('groupLoanApplications.detail.toastCancelled'), color: 'green' })
    confirmCancel.value = false
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    cancelling.value = false
  }
}

// ── Approve / reject decision ──────────────────────────────────────────────
const showDecision = ref(false)
const deciding = ref(false)
const decisionError = ref('')
const decisionForm = reactive<{
  decision: GroupLoanApprovalDecision
  members: (GroupLoanApprovalMemberDecision & { customerName: string })[]
  comments: string
}>({
  decision: 'APPROVED',
  members: [],
  comments: ''
})

function openDecision(decision: GroupLoanApprovalDecision) {
  decisionForm.decision = decision
  decisionForm.members = (application.value?.members ?? []).map((m) => ({
    customerId: m.customerId,
    customerName: m.customerName,
    approvedAmount: m.approvedAmount ?? m.requestedAmount,
    approvedInterestRate: m.approvedInterestRate ?? undefined,
    approvedTermMonths: m.approvedTermMonths ?? m.requestedTermMonths
  }))
  decisionForm.comments = ''
  decisionError.value = ''
  showDecision.value = true
}

async function onDecide() {
  if (
    decisionForm.decision === 'APPROVED' &&
    decisionForm.members.some(
      (m) => !m.approvedAmount || !m.approvedInterestRate || !m.approvedTermMonths
    )
  ) {
    decisionError.value = t('groupLoanApplications.detail.decisionValidationError')
    return
  }
  deciding.value = true
  decisionError.value = ''
  try {
    const payload: GroupLoanApplicationApprovalRequest = {
      decision: decisionForm.decision,
      members:
        decisionForm.decision === 'APPROVED'
          ? decisionForm.members.map((m) => ({
              customerId: m.customerId,
              approvedAmount: m.approvedAmount,
              approvedInterestRate: m.approvedInterestRate,
              approvedTermMonths: m.approvedTermMonths
            }))
          : undefined,
      comments: decisionForm.comments || undefined
    }
    await api(`/group-loan-applications/${applicationId}/approvals`, {
      method: 'POST',
      body: payload
    })
    toast.add({
      title:
        decisionForm.decision === 'APPROVED'
          ? t('groupLoanApplications.detail.toastApproved')
          : t('groupLoanApplications.detail.toastRejected'),
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
        await api(`/group-loan-applications/${applicationId}/documents/upload`, {
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
    await api(`/group-loan-applications/${applicationId}/documents/${documentId}/verify`, {
      method: 'PUT'
    })
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  }
}

async function onRejectDocument(documentId: number) {
  try {
    await api(`/group-loan-applications/${applicationId}/documents/${documentId}/reject`, {
      method: 'PUT'
    })
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  }
}

async function onDeleteDocument(documentId: number) {
  try {
    await api(`/group-loan-applications/${applicationId}/documents/${documentId}`, {
      method: 'DELETE'
    })
    toast.add({ title: t('groupLoanApplications.detail.toastDocumentDeleted'), color: 'green' })
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  }
}
</script>
