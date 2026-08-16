<template>
  <div v-if="group">
    <div class="flex items-center justify-between mb-6 gap-4">
      <div class="min-w-0">
        <UButton
          to="/groups"
          variant="link"
          icon="i-heroicons-arrow-left"
          size="xs"
          class="mb-0.5 px-0"
        >
          {{ t('groups.detail.backToGroups') }}
        </UButton>
        <h1 class="text-xl font-bold truncate">{{ group.name }}</h1>
      </div>
      <UButton
        v-if="group.status !== 'CLOSED'"
        color="orange"
        variant="soft"
        icon="i-heroicons-lock-closed"
        @click="confirmClose = true"
      >
        {{ t('groups.list.actions.close') }}
      </UButton>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <UCard>
        <template #header>
          <span class="font-semibold">{{ t('groups.detail.detailsHeader') }}</span>
        </template>
        <GroupForm
          v-if="group.status !== 'CLOSED'"
          :initial="group"
          :loading="savingDetails"
          :submit-label="t('common.saveChanges')"
          @submit="onSaveDetails"
        />
        <dl v-else class="space-y-2.5 text-sm">
          <div class="flex justify-between gap-4">
            <dt class="text-gray-500 dark:text-gray-400">{{ t('groups.form.code') }}</dt>
            <dd class="font-medium text-right">{{ group.code || '—' }}</dd>
          </div>
          <div class="flex justify-between gap-4">
            <dt class="text-gray-500 dark:text-gray-400">{{ t('groups.form.loanProduct') }}</dt>
            <dd class="font-medium text-right">{{ group.loanProductName || '—' }}</dd>
          </div>
          <div class="flex justify-between gap-4">
            <dt class="text-gray-500 dark:text-gray-400">{{ t('groups.form.branch') }}</dt>
            <dd class="font-medium text-right">{{ group.branchName || '—' }}</dd>
          </div>
          <div class="flex justify-between gap-4">
            <dt class="text-gray-500 dark:text-gray-400">{{ t('groups.form.leader') }}</dt>
            <dd class="font-medium text-right">{{ group.leaderName || '—' }}</dd>
          </div>
          <div class="flex justify-between gap-4">
            <dt class="text-gray-500 dark:text-gray-400">{{ t('groups.form.formationDate') }}</dt>
            <dd class="font-medium text-right">{{ formatDate(group.formationDate) }}</dd>
          </div>
        </dl>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <span class="font-semibold">{{ t('groups.detail.membersHeader') }}</span>
            <UButton
              v-if="group.status !== 'CLOSED'"
              size="xs"
              icon="i-heroicons-plus"
              @click="openAddMember"
            >
              {{ t('groups.detail.addMember') }}
            </UButton>
          </div>
        </template>
        <DataTable
          :rows="members ?? []"
          :columns="memberColumns"
          :loading="membersPending"
          export-filename="group-members.csv"
          refreshable
          @refresh="refreshMembers"
        >
          <template #actions-data="{ row }">
            <div class="flex items-center justify-end gap-1">
              <UButton :to="`/customers/${row.customerId}`" size="2xs" color="gray" variant="ghost">
                {{ t('groups.detail.viewKyc') }}
              </UButton>
              <template v-if="group.status !== 'CLOSED' && row.status === 'ACTIVE'">
                <UBadge
                  v-if="row.customerId === group.leaderCustomerId"
                  color="teal"
                  variant="subtle"
                >
                  {{ t('groups.detail.leaderBadge') }}
                </UBadge>
                <UButton
                  v-else
                  size="2xs"
                  color="gray"
                  variant="ghost"
                  :loading="makingLeaderId === row.customerId"
                  @click="onMakeLeader(row)"
                >
                  {{ t('groups.detail.makeLeader') }}
                </UButton>
                <UButton
                  v-if="row.customerId !== group.leaderCustomerId"
                  size="2xs"
                  color="red"
                  variant="soft"
                  icon="i-heroicons-x-mark"
                  :loading="removingMemberId === row.customerId"
                  @click="onRemoveMember(row)"
                >
                  {{ t('groups.detail.removeMember') }}
                </UButton>
              </template>
            </div>
          </template>
          <template #empty-state>
            <EmptyState
              icon="i-heroicons-user-group"
              :title="t('groups.detail.emptyMembersTitle')"
              :description="t('groups.detail.emptyMembersDescription')"
            >
              <template v-if="group.status !== 'CLOSED'" #action>
                <UButton icon="i-heroicons-plus" @click="openAddMember">{{
                  t('groups.detail.addMember')
                }}</UButton>
              </template>
            </EmptyState>
          </template>
        </DataTable>
      </UCard>
    </div>

    <UCard class="mt-6">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold">{{ t('groupLoanApplications.groupCard.header') }}</span>
          <UButton
            v-if="group.status !== 'CLOSED'"
            size="xs"
            icon="i-heroicons-plus"
            @click="openCreateApplication"
          >
            {{ t('groupLoanApplications.groupCard.newApplication') }}
          </UButton>
        </div>
      </template>
      <DataTable
        :rows="groupApplications ?? []"
        :columns="applicationColumns"
        :loading="applicationsPending"
        :exportable="false"
        numbered
        refreshable
        @select="
          (row: GroupLoanApplicationResponse) => router.push(`/group-loan-applications/${row.id}`)
        "
        @refresh="refreshApplications"
      >
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-document-text"
            :title="t('groupLoanApplications.groupCard.emptyTitle')"
            :description="t('groupLoanApplications.groupCard.emptyDescription')"
          >
            <template v-if="group.status !== 'CLOSED'" #action>
              <UButton icon="i-heroicons-plus" @click="openCreateApplication">{{
                t('groupLoanApplications.groupCard.newApplication')
              }}</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>
    </UCard>

    <UCard class="mt-6">
      <template #header>
        <span class="font-semibold">{{ t('groupLoanApplications.loanAccounts.header') }}</span>
      </template>
      <DataTable
        :rows="groupLoans ?? []"
        :columns="loanColumns"
        :loading="loansPending"
        :exportable="false"
        numbered
        @select="(row: LoanResponse) => router.push(`/loans/${row.id}`)"
      >
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-banknotes"
            :title="t('groupLoanApplications.loanAccounts.emptyTitle')"
            :description="t('groupLoanApplications.loanAccounts.emptyDescription')"
          />
        </template>
      </DataTable>
    </UCard>

    <UCard class="mt-6">
      <template #header>
        <span class="font-semibold">{{ t('groupLoanApplications.repayments.header') }}</span>
      </template>
      <DataTable
        :rows="groupPayments ?? []"
        :columns="paymentColumns"
        :loading="paymentsPending"
        :exportable="false"
      >
        <template #loanId-data="{ row }">
          <NuxtLink :to="`/loans/${row.loanId}`" class="text-primary-500 font-medium">
            #{{ row.loanId }}
          </NuxtLink>
        </template>
        <template #reversed-data="{ row }">
          <StatusBadge v-if="row.reversed" status="REVERSED" />
          <span v-else>—</span>
        </template>
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-banknotes"
            :title="t('groupLoanApplications.repayments.emptyTitle')"
            :description="t('groupLoanApplications.repayments.emptyDescription')"
          />
        </template>
      </DataTable>
    </UCard>

    <UModal v-model="showCreateApplication">
      <UCard>
        <template #header>
          <span class="font-semibold">{{
            t('groupLoanApplications.groupCard.newApplication')
          }}</span>
        </template>
        <div class="space-y-4">
          <UFormGroup :label="t('groupLoanApplications.groupCard.purpose')">
            <UTextarea v-model="createApplicationForm.purpose" :rows="2" />
          </UFormGroup>

          <div class="space-y-2">
            <p class="text-sm font-medium">
              {{ t('groupLoanApplications.groupCard.membersLabel') }}
            </p>
            <div
              v-for="row in createApplicationForm.members"
              :key="row.customerId"
              class="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center border-b border-gray-100 dark:border-gray-800 pb-2 last:border-0"
            >
              <UCheckbox v-model="row.include" :label="row.customerName" class="sm:col-span-2" />
              <UInput
                v-model.number="row.requestedAmount"
                type="number"
                min="1000"
                step="0.01"
                :disabled="!row.include"
                :placeholder="t('groupLoanApplications.groupCard.requestedAmountPlaceholder')"
              />
              <UInput
                v-model.number="row.requestedTermMonths"
                type="number"
                min="1"
                max="360"
                :disabled="!row.include"
                :placeholder="t('groupLoanApplications.groupCard.requestedTermPlaceholder')"
              />
            </div>
          </div>

          <UAlert
            v-if="createApplicationError"
            color="red"
            variant="subtle"
            :title="createApplicationError"
          />
          <div class="flex justify-end gap-2 pt-2">
            <UButton color="gray" variant="ghost" @click="showCreateApplication = false">{{
              t('common.cancel')
            }}</UButton>
            <UButton
              :loading="creatingApplication"
              :disabled="!canCreateApplication"
              @click="onCreateApplication"
            >
              {{ t('common.create') }}
            </UButton>
          </div>
        </div>
      </UCard>
    </UModal>

    <UModal v-model="showAddMember">
      <UCard>
        <template #header>
          <span class="font-semibold">{{
            t('groups.detail.addMemberModalTitle', { groupName: group.name })
          }}</span>
        </template>
        <DynamicForm
          v-model="addMemberForm"
          :fields="addMemberFields"
          :loading="addingMember"
          :error="addMemberError"
          :submit-label="t('groups.detail.addMember')"
          cancelable
          @submit="onAddMember"
          @cancel="showAddMember = false"
        />
      </UCard>
    </UModal>

    <ConfirmModal
      v-model="confirmClose"
      :title="t('groups.list.closeConfirmTitle')"
      :description="t('groups.list.closeConfirmDescription')"
      :confirm-label="t('groups.list.actions.close')"
      color="orange"
      :loading="closing"
      @confirm="onClose"
    />
  </div>
  <div v-else-if="groupError" class="py-8">
    <ErrorState :title="t('common.errorState.title')" :description="apiErrorMessage(groupError)">
      <template #action>
        <UButton
          size="sm"
          variant="soft"
          icon="i-heroicons-arrow-path"
          :loading="groupPending"
          @click="refreshGroup()"
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
  AddGroupMemberRequest,
  GroupLoanApplicationRequest,
  GroupLoanApplicationResponse,
  GroupLoanMemberRequest,
  GroupMemberResponse,
  GroupRequest,
  GroupResponse,
  SetGroupLeaderRequest
} from '~/features/groups/types'
import type { CustomerResponse } from '~/features/customers/types'
import type { LoanPaymentResponse, LoanResponse } from '~/features/loans/types'
import type { ColumnDef, FieldDef, PageResponse } from '~/shared/types'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const api = useApi()
const toast = useToast()

const groupId = route.params.id as string

const {
  data: group,
  error: groupError,
  pending: groupPending,
  refresh: refreshGroup
} = await useAsyncData(`group-${groupId}`, () => api<GroupResponse>(`/groups/${groupId}`))

// ── Details ─────────────────────────────────────────────────────────────
const savingDetails = ref(false)

async function onSaveDetails(payload: GroupRequest) {
  savingDetails.value = true
  try {
    await api(`/groups/${groupId}`, { method: 'PUT', body: payload })
    toast.add({ title: t('groups.detail.toast.updated'), color: 'green' })
    await refreshGroup()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    savingDetails.value = false
  }
}

// ── Members ─────────────────────────────────────────────────────────────
const {
  data: members,
  pending: membersPending,
  refresh: refreshMembers
} = await useAsyncData(`group-${groupId}-members`, () =>
  api<GroupMemberResponse[]>(`/groups/${groupId}/members`)
)

const memberColumns = computed<ColumnDef<GroupMemberResponse>[]>(() => [
  { key: 'customerName', label: t('groups.detail.memberColumn') },
  { key: 'role', label: t('groups.detail.roleColumn'), type: 'enum' },
  { key: 'status', label: t('groups.detail.membershipStatusColumn'), type: 'status' },
  { key: 'kycStatus', label: t('groups.detail.kycColumn'), type: 'status' },
  { key: 'joinedAt', label: t('groups.detail.joinedColumn'), type: 'datetime' },
  { key: 'actions', label: '', class: 'text-right' }
])

const showAddMember = ref(false)
const addingMember = ref(false)
const addMemberError = ref('')
const addMemberForm = ref<Record<string, any>>({})

// Only active memberships block re-adding — a customer who previously left
// (status LEFT) can be added back.
const memberCustomerIds = computed(
  () => new Set((members.value ?? []).filter((m) => m.status === 'ACTIVE').map((m) => m.customerId))
)

async function searchAvailableCustomers(query: string) {
  const result = await api<PageResponse<CustomerResponse>>('/customers', {
    query: { search: query, size: 20 }
  })
  return result.content
    .filter((c) => !memberCustomerIds.value.has(c.id))
    .map((c) => ({ label: `${c.fullName} (#${c.id})`, value: c.id }))
}

const addMemberFields = computed<FieldDef[]>(() => [
  {
    name: 'customerId',
    label: t('groups.detail.memberFieldLabel'),
    type: 'relationship',
    required: true,
    search: searchAvailableCustomers,
    placeholder: t('groups.detail.memberFieldPlaceholder')
  }
])

function openAddMember() {
  addMemberForm.value = { customerId: undefined }
  addMemberError.value = ''
  showAddMember.value = true
}

async function onAddMember(values: Record<string, any>) {
  addingMember.value = true
  addMemberError.value = ''
  try {
    const payload: AddGroupMemberRequest = { customerId: values.customerId }
    await api(`/groups/${groupId}/members`, { method: 'POST', body: payload })
    toast.add({ title: t('groups.detail.toast.memberAdded'), color: 'green' })
    showAddMember.value = false
    await Promise.all([refreshMembers(), refreshGroup()])
  } catch (err) {
    addMemberError.value = apiErrorMessage(err)
  } finally {
    addingMember.value = false
  }
}

const makingLeaderId = ref<number | null>(null)

async function onMakeLeader(row: GroupMemberResponse) {
  makingLeaderId.value = row.customerId
  try {
    const payload: SetGroupLeaderRequest = { customerId: row.customerId }
    await api(`/groups/${groupId}/leader`, { method: 'PUT', body: payload })
    toast.add({
      title: t('groups.detail.toast.leaderChanged', { name: row.customerName }),
      color: 'green'
    })
    await refreshGroup()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    makingLeaderId.value = null
  }
}

const removingMemberId = ref<number | null>(null)

async function onRemoveMember(row: GroupMemberResponse) {
  removingMemberId.value = row.customerId
  try {
    await api(`/groups/${groupId}/members/${row.customerId}/leave`, { method: 'PUT' })
    toast.add({
      title: t('groups.detail.toast.memberRemoved', { name: row.customerName }),
      color: 'green'
    })
    await Promise.all([refreshMembers(), refreshGroup()])
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    removingMemberId.value = null
  }
}

// ── Loan applications ───────────────────────────────────────────────────
const {
  data: groupApplications,
  pending: applicationsPending,
  refresh: refreshApplications
} = await useAsyncData(`group-${groupId}-loan-applications`, () =>
  api<GroupLoanApplicationResponse[]>(`/group-loan-applications/group/${groupId}`)
)

const applicationColumns = computed<ColumnDef<GroupLoanApplicationResponse>[]>(() => [
  { key: 'status', label: t('groupLoanApplications.groupCard.columns.status'), type: 'status' },
  {
    key: 'submittedAt',
    label: t('groupLoanApplications.groupCard.columns.submitted'),
    type: 'datetime'
  }
])

const showCreateApplication = ref(false)
const creatingApplication = ref(false)
const createApplicationError = ref('')
const createApplicationForm = reactive<{
  purpose: string
  members: {
    customerId: number
    customerName: string
    include: boolean
    requestedAmount: number | undefined
    requestedTermMonths: number | undefined
  }[]
}>({ purpose: '', members: [] })

function openCreateApplication() {
  createApplicationForm.purpose = ''
  createApplicationForm.members = (members.value ?? []).map((m) => ({
    customerId: m.customerId,
    customerName: m.customerName,
    include: true,
    requestedAmount: 1000,
    requestedTermMonths: 12
  }))
  createApplicationError.value = ''
  showCreateApplication.value = true
}

const canCreateApplication = computed(() =>
  createApplicationForm.members.some((m) => m.include && m.requestedAmount && m.requestedTermMonths)
)

async function onCreateApplication() {
  if (!canCreateApplication.value) return
  creatingApplication.value = true
  createApplicationError.value = ''
  try {
    const memberRequests: GroupLoanMemberRequest[] = createApplicationForm.members
      .filter((m) => m.include && m.requestedAmount && m.requestedTermMonths)
      .map((m) => ({
        customerId: m.customerId,
        requestedAmount: m.requestedAmount!,
        requestedTermMonths: m.requestedTermMonths!
      }))
    const payload: GroupLoanApplicationRequest = {
      groupId: Number(groupId),
      purpose: createApplicationForm.purpose || undefined,
      members: memberRequests
    }
    const created = await api<GroupLoanApplicationResponse>('/group-loan-applications', {
      method: 'POST',
      body: payload
    })
    toast.add({ title: t('groupLoanApplications.groupCard.toastCreated'), color: 'green' })
    showCreateApplication.value = false
    await refreshApplications()
    await router.push(`/group-loan-applications/${created.id}`)
  } catch (err) {
    createApplicationError.value = apiErrorMessage(err)
  } finally {
    creatingApplication.value = false
  }
}

// ── Loan accounts ───────────────────────────────────────────────────────
// Loans that originated from one of this group's applications (via each
// approved member line's loanId) — not every loan a member customer happens
// to have, since a customer could hold loans unrelated to this group.
const groupLoanIds = computed(() => [
  ...new Set(
    (groupApplications.value ?? [])
      .flatMap((a) => a.members)
      .map((m) => m.loanId)
      .filter((id): id is number => id !== null)
  )
])

const { data: groupLoans, pending: loansPending } = await useAsyncData(
  `group-${groupId}-loans`,
  () => Promise.all(groupLoanIds.value.map((id) => api<LoanResponse>(`/loans/${id}`))),
  { watch: [groupLoanIds] }
)

const loanColumns = computed<ColumnDef<LoanResponse>[]>(() => [
  { key: 'customerName', label: t('groupLoanApplications.loanAccounts.columns.customer') },
  {
    key: 'principal',
    label: t('groupLoanApplications.loanAccounts.columns.principal'),
    type: 'currency'
  },
  { key: 'status', label: t('groupLoanApplications.loanAccounts.columns.status'), type: 'status' },
  {
    key: 'outstandingBalance',
    label: t('groupLoanApplications.loanAccounts.columns.outstanding'),
    type: 'currency'
  },
  {
    key: 'disbursedAt',
    label: t('groupLoanApplications.loanAccounts.columns.disbursed'),
    type: 'datetime'
  }
])

// ── Repayments ──────────────────────────────────────────────────────────
type GroupPaymentRow = LoanPaymentResponse & { customerName: string }

const { data: groupPayments, pending: paymentsPending } = await useAsyncData(
  `group-${groupId}-payments`,
  async () => {
    const perLoan = await Promise.all(
      (groupLoans.value ?? []).map(async (loan) => {
        const payments = await api<LoanPaymentResponse[]>(`/loans/${loan.id}/payments`)
        return payments.map((p): GroupPaymentRow => ({ ...p, customerName: loan.customerName }))
      })
    )
    return perLoan
      .flat()
      .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
  },
  { watch: [groupLoans] }
)

const paymentColumns = computed<ColumnDef<GroupPaymentRow>[]>(() => [
  { key: 'customerName', label: t('groupLoanApplications.repayments.columns.customer') },
  { key: 'loanId', label: t('groupLoanApplications.repayments.columns.loan') },
  { key: 'amount', label: t('groupLoanApplications.repayments.columns.amount'), type: 'currency' },
  { key: 'paymentDate', label: t('groupLoanApplications.repayments.columns.date'), type: 'date' },
  { key: 'method', label: t('groupLoanApplications.repayments.columns.method'), type: 'enum' },
  { key: 'reversed', label: t('groupLoanApplications.repayments.columns.status') }
])

// ── Close group ─────────────────────────────────────────────────────────
const closing = ref(false)
const confirmClose = ref(false)

async function onClose() {
  closing.value = true
  try {
    await api(`/groups/${groupId}/close`, { method: 'POST' })
    toast.add({ title: t('groups.list.toast.closed', { name: group.value?.name }), color: 'green' })
    confirmClose.value = false
    await refreshGroup()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    closing.value = false
  }
}
</script>
