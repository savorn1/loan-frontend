<template>
  <div v-if="customer">
    <div class="flex items-center justify-between mb-6 gap-4">
      <div class="flex items-center gap-3 min-w-0">
        <div
          class="flex items-center justify-center w-11 h-11 rounded-full text-white font-semibold shrink-0 shadow-sm"
          :class="avatarGradient(`${customer.firstName} ${customer.lastName}`)"
        >
          {{ initials }}
        </div>
        <div class="min-w-0">
          <UButton
            to="/customers"
            variant="link"
            icon="i-heroicons-arrow-left"
            size="xs"
            class="mb-0.5 px-0"
          >
            {{ t('customers.detail.backToCustomers') }}
          </UButton>
          <h1 class="text-xl font-bold truncate">
            {{ customer.firstName }} {{ customer.lastName }}
          </h1>
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ customer.customerNo }}</p>
        </div>
      </div>
      <UButton
        v-if="isAdmin"
        color="red"
        variant="soft"
        icon="i-heroicons-trash"
        @click="confirmDelete = true"
      >
        {{ t('common.delete') }}
      </UButton>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <UCard>
        <template #header>
          <span class="font-semibold">{{ t('customers.detail.details') }}</span>
        </template>
        <CustomerForm
          :initial="customer"
          :loading="saving"
          :submit-label="t('common.saveChanges')"
          @submit="onUpdate"
        />
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <span class="font-semibold">{{ t('customers.detail.loans') }}</span>
            <UBadge v-if="loans?.length" color="gray" variant="subtle">{{ loans.length }}</UBadge>
          </div>
        </template>
        <DataTable
          :rows="loans ?? []"
          :columns="loanColumns"
          :loading="loansPending"
          export-filename="customer-loans.csv"
          numbered
          @select="(row: LoanResponse) => router.push(`/loans/${row.id}`)"
        >
          <template #empty-state>
            <EmptyState
              icon="i-heroicons-banknotes"
              :title="t('customers.detail.noLoansTitle')"
              :description="t('customers.detail.noLoansDescription')"
            />
          </template>
        </DataTable>
      </UCard>

      <UCard class="lg:col-span-2">
        <template #header>
          <div class="flex items-center justify-between">
            <span class="font-semibold">{{ t('customers.detail.identity.cardTitle') }}</span>
            <UButton size="xs" icon="i-heroicons-plus" @click="openCreateIdentity">{{
              t('customers.detail.identity.addButton')
            }}</UButton>
          </div>
        </template>
        <DataTable
          :rows="identities ?? []"
          :columns="identityColumns"
          :loading="identitiesPending"
          export-filename="customer-identities.csv"
        >
          <template #actions-data="{ row }">
            <div class="flex gap-1 justify-end">
              <UButton
                size="2xs"
                variant="soft"
                :color="row.scanFileUrl ? 'primary' : 'gray'"
                icon="i-heroicons-paper-clip"
                :aria-label="t('customers.detail.identity.scan')"
                @click="openIdentityScan(row)"
              />
              <UButton
                size="2xs"
                variant="soft"
                icon="i-heroicons-pencil"
                :aria-label="t('common.edit')"
                @click="openEditIdentity(row)"
              />
              <UButton
                size="2xs"
                color="red"
                variant="soft"
                icon="i-heroicons-trash"
                :aria-label="t('common.delete')"
                @click="confirmDeleteIdentity = row"
              />
            </div>
          </template>
          <template #empty-state>
            <EmptyState
              icon="i-heroicons-identification"
              :title="t('customers.detail.identity.emptyTitle')"
              :description="t('customers.detail.identity.emptyDescription')"
            >
              <template #action>
                <UButton icon="i-heroicons-plus" @click="openCreateIdentity">{{
                  t('customers.detail.identity.addButton')
                }}</UButton>
              </template>
            </EmptyState>
          </template>
        </DataTable>
      </UCard>

      <UCard class="lg:col-span-2">
        <template #header>
          <div class="flex items-center justify-between">
            <span class="font-semibold">{{ t('customers.detail.address.cardTitle') }}</span>
            <UButton size="xs" icon="i-heroicons-plus" @click="openCreateAddress">{{
              t('customers.detail.address.addButton')
            }}</UButton>
          </div>
        </template>
        <DataTable
          :rows="addresses ?? []"
          :columns="addressColumns"
          :loading="addressesPending"
          export-filename="customer-addresses.csv"
        >
          <template #actions-data="{ row }">
            <div class="flex gap-1 justify-end">
              <UButton
                size="2xs"
                variant="soft"
                icon="i-heroicons-pencil"
                :aria-label="t('common.edit')"
                @click="openEditAddress(row)"
              />
              <UButton
                size="2xs"
                color="red"
                variant="soft"
                icon="i-heroicons-trash"
                :aria-label="t('common.delete')"
                @click="confirmDeleteAddress = row"
              />
            </div>
          </template>
          <template #empty-state>
            <EmptyState
              icon="i-heroicons-map-pin"
              :title="t('customers.detail.address.emptyTitle')"
              :description="t('customers.detail.address.emptyDescription')"
            >
              <template #action>
                <UButton icon="i-heroicons-plus" @click="openCreateAddress">{{
                  t('customers.detail.address.addButton')
                }}</UButton>
              </template>
            </EmptyState>
          </template>
        </DataTable>
      </UCard>

      <UCard class="lg:col-span-2">
        <template #header>
          <div class="flex items-center justify-between">
            <span class="font-semibold">{{ t('customers.detail.contact.cardTitle') }}</span>
            <UButton size="xs" icon="i-heroicons-plus" @click="openCreateContact">{{
              t('customers.detail.contact.addButton')
            }}</UButton>
          </div>
        </template>
        <DataTable
          :rows="contacts ?? []"
          :columns="contactColumns"
          :loading="contactsPending"
          export-filename="customer-contacts.csv"
        >
          <template #actions-data="{ row }">
            <div class="flex gap-1 justify-end">
              <UButton
                size="2xs"
                variant="soft"
                icon="i-heroicons-pencil"
                :aria-label="t('common.edit')"
                @click="openEditContact(row)"
              />
              <UButton
                size="2xs"
                color="red"
                variant="soft"
                icon="i-heroicons-trash"
                :aria-label="t('common.delete')"
                @click="confirmDeleteContact = row"
              />
            </div>
          </template>
          <template #empty-state>
            <EmptyState
              icon="i-heroicons-user-circle"
              :title="t('customers.detail.contact.emptyTitle')"
              :description="t('customers.detail.contact.emptyDescription')"
            >
              <template #action>
                <UButton icon="i-heroicons-plus" @click="openCreateContact">{{
                  t('customers.detail.contact.addButton')
                }}</UButton>
              </template>
            </EmptyState>
          </template>
        </DataTable>
      </UCard>

      <UCard class="lg:col-span-2">
        <template #header>
          <div class="flex items-center justify-between">
            <span class="font-semibold">{{ t('customers.detail.employment.cardTitle') }}</span>
            <UButton size="xs" icon="i-heroicons-plus" @click="openCreateEmployment">{{
              t('customers.detail.employment.addButton')
            }}</UButton>
          </div>
        </template>
        <DataTable
          :rows="employments ?? []"
          :columns="employmentColumns"
          :loading="employmentsPending"
          export-filename="customer-employments.csv"
        >
          <template #actions-data="{ row }">
            <div class="flex gap-1 justify-end">
              <UButton
                size="2xs"
                variant="soft"
                icon="i-heroicons-pencil"
                :aria-label="t('common.edit')"
                @click="openEditEmployment(row)"
              />
              <UButton
                size="2xs"
                color="red"
                variant="soft"
                icon="i-heroicons-trash"
                :aria-label="t('common.delete')"
                @click="confirmDeleteEmployment = row"
              />
            </div>
          </template>
          <template #empty-state>
            <EmptyState
              icon="i-heroicons-briefcase"
              :title="t('customers.detail.employment.emptyTitle')"
              :description="t('customers.detail.employment.emptyDescription')"
            >
              <template #action>
                <UButton icon="i-heroicons-plus" @click="openCreateEmployment">{{
                  t('customers.detail.employment.addButton')
                }}</UButton>
              </template>
            </EmptyState>
          </template>
        </DataTable>
      </UCard>

      <UCard class="lg:col-span-2">
        <template #header>
          <div class="flex items-center justify-between">
            <span class="font-semibold">{{ t('customers.detail.income.cardTitle') }}</span>
            <UButton size="xs" icon="i-heroicons-plus" @click="openCreateIncome">{{
              t('customers.detail.income.addButton')
            }}</UButton>
          </div>
        </template>
        <DataTable
          :rows="incomes ?? []"
          :columns="incomeColumns"
          :loading="incomesPending"
          export-filename="customer-incomes.csv"
        >
          <template #actions-data="{ row }">
            <div class="flex gap-1 justify-end">
              <UButton
                size="2xs"
                variant="soft"
                icon="i-heroicons-pencil"
                :aria-label="t('common.edit')"
                @click="openEditIncome(row)"
              />
              <UButton
                size="2xs"
                color="red"
                variant="soft"
                icon="i-heroicons-trash"
                :aria-label="t('common.delete')"
                @click="confirmDeleteIncome = row"
              />
            </div>
          </template>
          <template #empty-state>
            <EmptyState
              icon="i-heroicons-banknotes"
              :title="t('customers.detail.income.emptyTitle')"
              :description="t('customers.detail.income.emptyDescription')"
            >
              <template #action>
                <UButton icon="i-heroicons-plus" @click="openCreateIncome">{{
                  t('customers.detail.income.addButton')
                }}</UButton>
              </template>
            </EmptyState>
          </template>
        </DataTable>
      </UCard>

      <UCard class="lg:col-span-2">
        <template #header>
          <div class="flex items-center justify-between">
            <span class="font-semibold">{{ t('customers.detail.relationship.cardTitle') }}</span>
            <UButton size="xs" icon="i-heroicons-plus" @click="openCreateRelationship">{{
              t('customers.detail.relationship.addButton')
            }}</UButton>
          </div>
        </template>
        <DataTable
          :rows="relationships ?? []"
          :columns="relationshipColumns"
          :loading="relationshipsPending"
          export-filename="customer-relationships.csv"
        >
          <template #actions-data="{ row }">
            <div class="flex gap-1 justify-end">
              <UButton
                size="2xs"
                variant="soft"
                icon="i-heroicons-pencil"
                :aria-label="t('common.edit')"
                @click="openEditRelationship(row)"
              />
              <UButton
                size="2xs"
                color="red"
                variant="soft"
                icon="i-heroicons-trash"
                :aria-label="t('common.delete')"
                @click="confirmDeleteRelationship = row"
              />
            </div>
          </template>
          <template #empty-state>
            <EmptyState
              icon="i-heroicons-users"
              :title="t('customers.detail.relationship.emptyTitle')"
              :description="t('customers.detail.relationship.emptyDescription')"
            >
              <template #action>
                <UButton icon="i-heroicons-plus" @click="openCreateRelationship">{{
                  t('customers.detail.relationship.addButton')
                }}</UButton>
              </template>
            </EmptyState>
          </template>
        </DataTable>
      </UCard>

      <UCard class="lg:col-span-2">
        <template #header>
          <span class="font-semibold">{{ t('customers.detail.riskProfile.cardTitle') }}</span>
        </template>
        <DynamicForm
          v-model="riskProfileForm"
          :fields="riskProfileFields"
          :loading="savingRiskProfile"
          :submit-label="t('common.save')"
          @submit="onSaveRiskProfile"
        />
      </UCard>

      <UCard class="lg:col-span-2">
        <template #header>
          <span class="font-semibold">{{ t('customers.detail.preferences.cardTitle') }}</span>
        </template>
        <DynamicForm
          v-model="preferenceForm"
          :fields="preferenceFields"
          :loading="savingPreferences"
          :submit-label="t('common.save')"
          @submit="onSavePreferences"
        />
      </UCard>

      <UCard class="lg:col-span-2">
        <template #header>
          <span class="font-semibold">{{ t('customers.detail.auditLog.cardTitle') }}</span>
        </template>
        <DataTable
          :rows="auditLogs ?? []"
          :columns="auditLogColumns"
          :loading="auditLogsPending"
          export-filename="customer-audit-log.csv"
        >
          <template #empty-state>
            <EmptyState
              icon="i-heroicons-clock"
              :title="t('customers.detail.auditLog.emptyTitle')"
              :description="t('customers.detail.auditLog.emptyDescription')"
            />
          </template>
        </DataTable>
      </UCard>
    </div>

    <UModal v-model="showCreateIdentity">
      <UCard>
        <template #header>
          <span class="font-semibold">{{ t('customers.detail.identity.addModalTitle') }}</span>
        </template>
        <DynamicForm
          v-model="createIdentityForm"
          :fields="identityFields"
          :loading="creatingIdentity"
          :error="identityError"
          :submit-label="t('customers.detail.add')"
          cancelable
          @submit="onCreateIdentity"
          @cancel="showCreateIdentity = false"
        />
      </UCard>
    </UModal>

    <UModal v-model="showEditIdentity">
      <UCard>
        <template #header>
          <span class="font-semibold">{{ t('customers.detail.identity.editModalTitle') }}</span>
        </template>
        <DynamicForm
          v-model="editIdentityForm"
          :fields="identityFields"
          :loading="editingIdentity"
          :error="editIdentityError"
          :submit-label="t('common.saveChanges')"
          cancelable
          @submit="onEditIdentity"
          @cancel="showEditIdentity = false"
        />
      </UCard>
    </UModal>

    <ConfirmModal
      :model-value="confirmDeleteIdentity !== null"
      :title="
        confirmDeleteIdentity
          ? t('customers.detail.identity.deleteTitle', {
              name: `${humanize(confirmDeleteIdentity.identityType)} — ${confirmDeleteIdentity.identityNumber}`
            })
          : ''
      "
      :description="t('customers.detail.identity.deleteDescription')"
      :confirm-label="t('common.delete')"
      color="red"
      :loading="deletingIdentity"
      @update:model-value="
        (v: boolean) => {
          if (!v) confirmDeleteIdentity = null
        }
      "
      @confirm="onDeleteIdentity"
    />

    <UModal
      :model-value="identityScanTarget !== null"
      @update:model-value="
        (v: boolean) => {
          if (!v) identityScanTarget = null
        }
      "
    >
      <UCard v-if="identityScanTarget">
        <template #header>
          <span class="font-semibold">{{ t('customers.detail.identity.scan') }}</span>
        </template>

        <div
          v-if="identityScanTarget.scanFileUrl"
          class="flex items-center justify-between gap-2 mb-4"
        >
          <a
            :href="identityScanTarget.scanFileUrl"
            target="_blank"
            rel="noopener"
            class="text-sm font-medium truncate text-primary-500 hover:underline"
          >
            {{ identityScanTarget.scanFileName }}
          </a>
          <UButton
            size="2xs"
            color="red"
            variant="soft"
            icon="i-heroicons-trash"
            :loading="removingIdentityScan"
            @click="onRemoveIdentityScan"
          >
            {{ t('common.remove') }}
          </UButton>
        </div>
        <EmptyState
          v-else
          icon="i-heroicons-paper-clip"
          :title="t('customers.detail.identity.noScanTitle')"
          :description="t('customers.detail.identity.noScanDescription')"
        />

        <FileUpload
          v-model="identityScanToUpload"
          accept="image/*,application/pdf"
          :max-size-mb="10"
          :disabled="uploadingIdentityScan"
          class="mt-4"
        />
        <div class="flex justify-end gap-2 pt-4">
          <UButton color="gray" variant="ghost" @click="identityScanTarget = null">{{
            t('common.close')
          }}</UButton>
          <UButton
            :loading="uploadingIdentityScan"
            :disabled="!identityScanToUpload"
            @click="onUploadIdentityScan"
          >
            {{ t('customers.detail.identity.uploadScan') }}
          </UButton>
        </div>
      </UCard>
    </UModal>

    <UModal v-model="showCreateAddress">
      <UCard>
        <template #header>
          <span class="font-semibold">{{ t('customers.detail.address.addModalTitle') }}</span>
        </template>
        <DynamicForm
          v-model="createAddressForm"
          :fields="addressFields"
          :loading="creatingAddress"
          :error="addressError"
          :submit-label="t('customers.detail.add')"
          cancelable
          @submit="onCreateAddress"
          @cancel="showCreateAddress = false"
        />
      </UCard>
    </UModal>

    <UModal v-model="showEditAddress">
      <UCard>
        <template #header>
          <span class="font-semibold">{{ t('customers.detail.address.editModalTitle') }}</span>
        </template>
        <DynamicForm
          v-model="editAddressForm"
          :fields="addressFields"
          :loading="editingAddress"
          :error="editAddressError"
          :submit-label="t('common.saveChanges')"
          cancelable
          @submit="onEditAddress"
          @cancel="showEditAddress = false"
        />
      </UCard>
    </UModal>

    <ConfirmModal
      :model-value="confirmDeleteAddress !== null"
      :title="
        confirmDeleteAddress
          ? t('customers.detail.address.deleteTitle', {
              name: humanize(confirmDeleteAddress.addressType)
            })
          : ''
      "
      :description="t('customers.detail.address.deleteDescription')"
      :confirm-label="t('common.delete')"
      color="red"
      :loading="deletingAddress"
      @update:model-value="
        (v: boolean) => {
          if (!v) confirmDeleteAddress = null
        }
      "
      @confirm="onDeleteAddress"
    />

    <UModal v-model="showCreateContact">
      <UCard>
        <template #header>
          <span class="font-semibold">{{ t('customers.detail.contact.addModalTitle') }}</span>
        </template>
        <DynamicForm
          v-model="createContactForm"
          :fields="contactFields"
          :loading="creatingContact"
          :error="contactError"
          :submit-label="t('customers.detail.add')"
          cancelable
          @submit="onCreateContact"
          @cancel="showCreateContact = false"
        />
      </UCard>
    </UModal>

    <UModal v-model="showEditContact">
      <UCard>
        <template #header>
          <span class="font-semibold">{{ t('customers.detail.contact.editModalTitle') }}</span>
        </template>
        <DynamicForm
          v-model="editContactForm"
          :fields="contactFields"
          :loading="editingContact"
          :error="editContactError"
          :submit-label="t('common.saveChanges')"
          cancelable
          @submit="onEditContact"
          @cancel="showEditContact = false"
        />
      </UCard>
    </UModal>

    <ConfirmModal
      :model-value="confirmDeleteContact !== null"
      :title="
        confirmDeleteContact
          ? t('customers.detail.contact.deleteTitle', { name: confirmDeleteContact.name })
          : ''
      "
      :description="t('customers.detail.contact.deleteDescription')"
      :confirm-label="t('common.delete')"
      color="red"
      :loading="deletingContact"
      @update:model-value="
        (v: boolean) => {
          if (!v) confirmDeleteContact = null
        }
      "
      @confirm="onDeleteContact"
    />

    <UModal v-model="showCreateEmployment">
      <UCard>
        <template #header>
          <span class="font-semibold">{{ t('customers.detail.employment.addModalTitle') }}</span>
        </template>
        <DynamicForm
          v-model="createEmploymentForm"
          :fields="employmentFields"
          :loading="creatingEmployment"
          :error="employmentError"
          :submit-label="t('customers.detail.add')"
          cancelable
          @submit="onCreateEmployment"
          @cancel="showCreateEmployment = false"
        />
      </UCard>
    </UModal>

    <UModal v-model="showEditEmployment">
      <UCard>
        <template #header>
          <span class="font-semibold">{{ t('customers.detail.employment.editModalTitle') }}</span>
        </template>
        <DynamicForm
          v-model="editEmploymentForm"
          :fields="employmentFields"
          :loading="editingEmployment"
          :error="editEmploymentError"
          :submit-label="t('common.saveChanges')"
          cancelable
          @submit="onEditEmployment"
          @cancel="showEditEmployment = false"
        />
      </UCard>
    </UModal>

    <ConfirmModal
      :model-value="confirmDeleteEmployment !== null"
      :title="
        confirmDeleteEmployment
          ? t('customers.detail.employment.deleteTitle', {
              name: confirmDeleteEmployment.companyName
            })
          : ''
      "
      :description="t('customers.detail.employment.deleteDescription')"
      :confirm-label="t('common.delete')"
      color="red"
      :loading="deletingEmployment"
      @update:model-value="
        (v: boolean) => {
          if (!v) confirmDeleteEmployment = null
        }
      "
      @confirm="onDeleteEmployment"
    />

    <UModal v-model="showCreateIncome">
      <UCard>
        <template #header>
          <span class="font-semibold">{{ t('customers.detail.income.addModalTitle') }}</span>
        </template>
        <DynamicForm
          v-model="createIncomeForm"
          :fields="incomeFields"
          :loading="creatingIncome"
          :error="incomeError"
          :submit-label="t('customers.detail.add')"
          cancelable
          @submit="onCreateIncome"
          @cancel="showCreateIncome = false"
        />
      </UCard>
    </UModal>

    <UModal v-model="showEditIncome">
      <UCard>
        <template #header>
          <span class="font-semibold">{{ t('customers.detail.income.editModalTitle') }}</span>
        </template>
        <DynamicForm
          v-model="editIncomeForm"
          :fields="incomeFields"
          :loading="editingIncome"
          :error="editIncomeError"
          :submit-label="t('common.saveChanges')"
          cancelable
          @submit="onEditIncome"
          @cancel="showEditIncome = false"
        />
      </UCard>
    </UModal>

    <ConfirmModal
      :model-value="confirmDeleteIncome !== null"
      :title="
        confirmDeleteIncome
          ? t('customers.detail.income.deleteTitle', {
              name: humanize(confirmDeleteIncome.incomeType)
            })
          : ''
      "
      :description="t('customers.detail.income.deleteDescription')"
      :confirm-label="t('common.delete')"
      color="red"
      :loading="deletingIncome"
      @update:model-value="
        (v: boolean) => {
          if (!v) confirmDeleteIncome = null
        }
      "
      @confirm="onDeleteIncome"
    />

    <UModal v-model="showCreateRelationship">
      <UCard>
        <template #header>
          <span class="font-semibold">{{ t('customers.detail.relationship.addModalTitle') }}</span>
        </template>
        <DynamicForm
          v-model="createRelationshipForm"
          :fields="relationshipFields"
          :loading="creatingRelationship"
          :error="relationshipError"
          :submit-label="t('customers.detail.add')"
          cancelable
          @submit="onCreateRelationship"
          @cancel="showCreateRelationship = false"
        />
      </UCard>
    </UModal>

    <UModal v-model="showEditRelationship">
      <UCard>
        <template #header>
          <span class="font-semibold">{{ t('customers.detail.relationship.editModalTitle') }}</span>
        </template>
        <DynamicForm
          v-model="editRelationshipForm"
          :fields="relationshipFields"
          :loading="editingRelationship"
          :error="editRelationshipError"
          :submit-label="t('common.saveChanges')"
          cancelable
          @submit="onEditRelationship"
          @cancel="showEditRelationship = false"
        />
      </UCard>
    </UModal>

    <ConfirmModal
      :model-value="confirmDeleteRelationship !== null"
      :title="
        confirmDeleteRelationship
          ? t('customers.detail.relationship.deleteTitle', {
              name: confirmDeleteRelationship.relatedCustomerName
            })
          : ''
      "
      :description="t('customers.detail.relationship.deleteDescription')"
      :confirm-label="t('common.delete')"
      color="red"
      :loading="deletingRelationship"
      @update:model-value="
        (v: boolean) => {
          if (!v) confirmDeleteRelationship = null
        }
      "
      @confirm="onDeleteRelationship"
    />

    <ConfirmModal
      v-model="confirmDelete"
      :title="t('customers.detail.deleteCustomerTitle')"
      :description="
        t('customers.detail.deleteCustomerDescription', {
          name: `${customer.firstName} ${customer.lastName}`
        })
      "
      :confirm-label="t('common.delete')"
      color="red"
      :loading="deleting"
      @confirm="onDelete"
    />
  </div>
  <div v-else-if="customerError" class="py-8">
    <ErrorState :title="t('common.errorState.title')" :description="apiErrorMessage(customerError)">
      <template #action>
        <UButton
          size="sm"
          variant="soft"
          icon="i-heroicons-arrow-path"
          :loading="customerPending"
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
  CustomerAddressRequest,
  CustomerAddressResponse,
  CustomerAuditLogResponse,
  CustomerContactRequest,
  CustomerContactResponse,
  CustomerEmploymentRequest,
  CustomerEmploymentResponse,
  CustomerIdentityRequest,
  CustomerIdentityResponse,
  CustomerIncomeRequest,
  CustomerIncomeResponse,
  CustomerPreferenceRequest,
  CustomerPreferenceResponse,
  CustomerRelationshipRequest,
  CustomerRelationshipResponse,
  CustomerRequest,
  CustomerResponse,
  CustomerRiskProfileRequest,
  CustomerRiskProfileResponse
} from '~/features/customers/types'
import type { LoanResponse } from '~/features/loans/types'
import type { ColumnDef, FieldDef, PageResponse } from '~/shared/types'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const api = useApi()
const toast = useToast()
const { isAdmin } = storeToRefs(useAuth())

const customerId = route.params.id as string

const {
  data: customer,
  error: customerError,
  pending: customerPending,
  refresh
} = await useAsyncData(`customer-${customerId}`, () =>
  api<CustomerResponse>(`/customers/${customerId}`)
)
const { data: loans, pending: loansPending } = await useAsyncData(
  `customer-${customerId}-loans`,
  () => api<LoanResponse[]>(`/loans/customer/${customerId}`)
)
const {
  data: identities,
  pending: identitiesPending,
  refresh: refreshIdentities
} = await useAsyncData(`customer-${customerId}-identities`, () =>
  api<CustomerIdentityResponse[]>(`/customers/${customerId}/identities`)
)
const {
  data: addresses,
  pending: addressesPending,
  refresh: refreshAddresses
} = await useAsyncData(`customer-${customerId}-addresses`, () =>
  api<CustomerAddressResponse[]>(`/customers/${customerId}/addresses`)
)
const {
  data: contacts,
  pending: contactsPending,
  refresh: refreshContacts
} = await useAsyncData(`customer-${customerId}-contacts`, () =>
  api<CustomerContactResponse[]>(`/customers/${customerId}/contacts`)
)
const {
  data: employments,
  pending: employmentsPending,
  refresh: refreshEmployments
} = await useAsyncData(`customer-${customerId}-employments`, () =>
  api<CustomerEmploymentResponse[]>(`/customers/${customerId}/employments`)
)
const {
  data: incomes,
  pending: incomesPending,
  refresh: refreshIncomes
} = await useAsyncData(`customer-${customerId}-incomes`, () =>
  api<CustomerIncomeResponse[]>(`/customers/${customerId}/incomes`)
)
const {
  data: relationships,
  pending: relationshipsPending,
  refresh: refreshRelationships
} = await useAsyncData(`customer-${customerId}-relationships`, () =>
  api<CustomerRelationshipResponse[]>(`/customers/${customerId}/relationships`)
)
const { data: riskProfile, refresh: refreshRiskProfile } = await useAsyncData(
  `customer-${customerId}-risk-profile`,
  () => api<CustomerRiskProfileResponse | null>(`/customers/${customerId}/risk-profile`)
)
const { data: preferences, refresh: refreshPreferences } = await useAsyncData(
  `customer-${customerId}-preferences`,
  () => api<CustomerPreferenceResponse | null>(`/customers/${customerId}/preferences`)
)
const { data: auditLogs, pending: auditLogsPending } = await useAsyncData(
  `customer-${customerId}-audit-logs`,
  () => api<CustomerAuditLogResponse[]>(`/customers/${customerId}/audit-logs`)
)

const initials = computed(() => {
  if (!customer.value) return ''
  return customer.value && customer.value.firstName && customer.value.lastName
    ? `${customer.value.firstName.charAt(0)}${customer.value.lastName.charAt(0)}`.toUpperCase()
    : ''
})

const saving = ref(false)
const deleting = ref(false)
const confirmDelete = ref(false)

const loanColumns: ColumnDef<LoanResponse>[] = [
  { key: 'principal', type: 'currency' },
  { key: 'termMonths', label: 'Term (mo)' },
  { key: 'status', type: 'status' },
  { key: 'createdAt', label: 'Created', type: 'datetime' }
]

const now = new Date()
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

const identityColumns: ColumnDef<CustomerIdentityResponse>[] = [
  { key: 'identityType', label: 'Type', type: 'enum' },
  { key: 'identityNumber', label: 'Number' },
  { key: 'issuingCountry', label: 'Issuing country' },
  { key: 'issueDate', label: 'Issued', type: 'date' },
  { key: 'expiryDate', label: 'Expires', type: 'date' },
  { key: 'status', type: 'status' },
  { key: 'actions', label: '', class: 'text-right' }
]

const identityFields: FieldDef[] = [
  {
    name: 'identityType',
    label: 'Type',
    type: 'select',
    required: true,
    wrapper: 'half',
    options: [
      { label: 'National ID', value: 'NATIONAL_ID' },
      { label: 'Passport', value: 'PASSPORT' },
      { label: 'Driver License', value: 'DRIVER_LICENSE' }
    ]
  },
  { name: 'identityNumber', label: 'Number', required: true, wrapper: 'half' },
  { name: 'issuingCountry', label: 'Issuing country', wrapper: 'half' },
  {
    name: 'status',
    type: 'select',
    wrapper: 'half',
    options: [
      { label: 'Active', value: 'ACTIVE' },
      { label: 'Expired', value: 'EXPIRED' },
      { label: 'Revoked', value: 'REVOKED' }
    ]
  },
  { name: 'issueDate', label: 'Issue date', type: 'date', max: today, wrapper: 'half' },
  { name: 'expiryDate', label: 'Expiry date', type: 'date', wrapper: 'half' }
]

const {
  showCreate: showCreateIdentity,
  creating: creatingIdentity,
  error: identityError,
  createForm: createIdentityForm,
  openCreate: openCreateIdentity,
  onCreate: onCreateIdentity,
  showEdit: showEditIdentity,
  editing: editingIdentity,
  editError: editIdentityError,
  editForm: editIdentityForm,
  openEdit: openEditIdentity,
  onEdit: onEditIdentity,
  deleting: deletingIdentity,
  confirmDelete: confirmDeleteIdentity,
  onDelete: onDeleteIdentity
} = useCrudModals<CustomerIdentityResponse, CustomerIdentityRequest>(
  `/customers/${customerId}/identities`,
  refreshIdentities,
  {
    entityName: 'Identity',
    createDefaults: () => ({
      identityType: undefined,
      identityNumber: '',
      issuingCountry: '',
      status: 'ACTIVE',
      issueDate: '',
      expiryDate: ''
    }),
    toForm: (row) => ({
      identityType: row.identityType,
      identityNumber: row.identityNumber,
      issuingCountry: row.issuingCountry ?? '',
      status: row.status,
      issueDate: row.issueDate ?? '',
      expiryDate: row.expiryDate ?? ''
    }),
    toPayload: (values) => ({
      identityType: values.identityType,
      identityNumber: values.identityNumber,
      issuingCountry: values.issuingCountry || undefined,
      status: values.status || undefined,
      issueDate: values.issueDate || undefined,
      expiryDate: values.expiryDate || undefined
    })
  }
)

// ── Identity scan ────────────────────────────────────────────────────────────
const identityScanTarget = ref<CustomerIdentityResponse | null>(null)
const identityScanToUpload = ref<File | null>(null)
const uploadingIdentityScan = ref(false)
const removingIdentityScan = ref(false)

function openIdentityScan(row: CustomerIdentityResponse) {
  identityScanTarget.value = row
  identityScanToUpload.value = null
}

async function onUploadIdentityScan() {
  if (!identityScanTarget.value || !identityScanToUpload.value) return
  uploadingIdentityScan.value = true
  try {
    const formData = new FormData()
    formData.append('file', identityScanToUpload.value)
    const updated = await api<CustomerIdentityResponse>(
      `/customers/${customerId}/identities/${identityScanTarget.value.id}/scan`,
      { method: 'POST', body: formData }
    )
    identityScanTarget.value = updated
    identityScanToUpload.value = null
    await refreshIdentities()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    uploadingIdentityScan.value = false
  }
}

async function onRemoveIdentityScan() {
  if (!identityScanTarget.value) return
  removingIdentityScan.value = true
  try {
    const updated = await api<CustomerIdentityResponse>(
      `/customers/${customerId}/identities/${identityScanTarget.value.id}/scan`,
      { method: 'DELETE' }
    )
    identityScanTarget.value = updated
    await refreshIdentities()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    removingIdentityScan.value = false
  }
}

const addressColumns: ColumnDef<CustomerAddressResponse>[] = [
  { key: 'addressType', label: 'Type', type: 'enum' },
  {
    key: 'street',
    label: 'Location',
    value: (row) =>
      [row.street, row.village, row.commune, row.district, row.province, row.country]
        .filter(Boolean)
        .join(', ')
  },
  { key: 'postalCode', label: 'Postal code' },
  {
    key: 'isPrimary',
    label: 'Primary',
    type: 'boolean',
    trueLabel: 'Primary',
    falseLabel: '',
    trueColor: 'teal'
  },
  { key: 'actions', label: '', class: 'text-right' }
]

const addressFields: FieldDef[] = [
  {
    name: 'addressType',
    label: 'Type',
    type: 'select',
    required: true,
    wrapper: 'half',
    options: [
      { label: 'Current', value: 'CURRENT' },
      { label: 'Permanent', value: 'PERMANENT' },
      { label: 'Office', value: 'OFFICE' }
    ]
  },
  { name: 'isPrimary', label: 'Primary address', type: 'switch', wrapper: 'half' },
  { name: 'country', wrapper: 'half' },
  { name: 'province', wrapper: 'half' },
  { name: 'district', wrapper: 'half' },
  { name: 'commune', wrapper: 'half' },
  { name: 'village', wrapper: 'half' },
  { name: 'street', wrapper: 'half' },
  { name: 'postalCode', label: 'Postal code', wrapper: 'half' }
]

const {
  showCreate: showCreateAddress,
  creating: creatingAddress,
  error: addressError,
  createForm: createAddressForm,
  openCreate: openCreateAddress,
  onCreate: onCreateAddress,
  showEdit: showEditAddress,
  editing: editingAddress,
  editError: editAddressError,
  editForm: editAddressForm,
  openEdit: openEditAddress,
  onEdit: onEditAddress,
  deleting: deletingAddress,
  confirmDelete: confirmDeleteAddress,
  onDelete: onDeleteAddress
} = useCrudModals<CustomerAddressResponse, CustomerAddressRequest>(
  `/customers/${customerId}/addresses`,
  refreshAddresses,
  {
    entityName: 'Address',
    createDefaults: () => ({
      addressType: undefined,
      country: '',
      province: '',
      district: '',
      commune: '',
      village: '',
      street: '',
      postalCode: '',
      isPrimary: false
    }),
    toForm: (row) => ({
      addressType: row.addressType,
      country: row.country ?? '',
      province: row.province ?? '',
      district: row.district ?? '',
      commune: row.commune ?? '',
      village: row.village ?? '',
      street: row.street ?? '',
      postalCode: row.postalCode ?? '',
      isPrimary: row.isPrimary
    }),
    toPayload: (values) => ({
      addressType: values.addressType,
      country: values.country || undefined,
      province: values.province || undefined,
      district: values.district || undefined,
      commune: values.commune || undefined,
      village: values.village || undefined,
      street: values.street || undefined,
      postalCode: values.postalCode || undefined,
      isPrimary: !!values.isPrimary
    })
  }
)

const contactColumns: ColumnDef<CustomerContactResponse>[] = [
  { key: 'name' },
  { key: 'relationship' },
  { key: 'phone' },
  { key: 'email' },
  { key: 'address' },
  { key: 'actions', label: '', class: 'text-right' }
]

const contactFields: FieldDef[] = [
  { name: 'name', required: true, wrapper: 'half' },
  { name: 'relationship', wrapper: 'half' },
  { name: 'phone', type: 'phone', wrapper: 'half' },
  { name: 'email', type: 'email', icon: 'i-heroicons-envelope', wrapper: 'half' },
  { name: 'address', icon: 'i-heroicons-map-pin' }
]

const {
  showCreate: showCreateContact,
  creating: creatingContact,
  error: contactError,
  createForm: createContactForm,
  openCreate: openCreateContact,
  onCreate: onCreateContact,
  showEdit: showEditContact,
  editing: editingContact,
  editError: editContactError,
  editForm: editContactForm,
  openEdit: openEditContact,
  onEdit: onEditContact,
  deleting: deletingContact,
  confirmDelete: confirmDeleteContact,
  onDelete: onDeleteContact
} = useCrudModals<CustomerContactResponse, CustomerContactRequest>(
  `/customers/${customerId}/contacts`,
  refreshContacts,
  {
    entityName: 'Contact',
    createDefaults: () => ({
      name: '',
      relationship: '',
      phone: '',
      email: '',
      address: ''
    }),
    toForm: (row) => ({
      name: row.name,
      relationship: row.relationship ?? '',
      phone: row.phone ?? '',
      email: row.email ?? '',
      address: row.address ?? ''
    }),
    toPayload: (values) => ({
      name: values.name,
      relationship: values.relationship || undefined,
      phone: values.phone || undefined,
      email: values.email || undefined,
      address: values.address || undefined
    })
  }
)

const employmentColumns: ColumnDef<CustomerEmploymentResponse>[] = [
  { key: 'companyName', label: 'Company' },
  { key: 'occupation' },
  { key: 'employmentType', label: 'Type', type: 'enum' },
  {
    key: 'salary',
    value: (row) =>
      row.salary == null
        ? ''
        : `${row.salary.toLocaleString()}${row.currency ? ' ' + row.currency : ''}`
  },
  { key: 'startDate', label: 'Start date', type: 'date' },
  { key: 'status', type: 'status' },
  { key: 'actions', label: '', class: 'text-right' }
]

const employmentFields: FieldDef[] = [
  { name: 'companyName', label: 'Company name', required: true, wrapper: 'half' },
  { name: 'occupation', wrapper: 'half' },
  {
    name: 'employmentType',
    label: 'Type',
    type: 'select',
    required: true,
    wrapper: 'half',
    options: [
      { label: 'Full time', value: 'FULL_TIME' },
      { label: 'Part time', value: 'PART_TIME' },
      { label: 'Self employed', value: 'SELF_EMPLOYED' },
      { label: 'Contract', value: 'CONTRACT' },
      { label: 'Unemployed', value: 'UNEMPLOYED' }
    ]
  },
  {
    name: 'status',
    type: 'select',
    wrapper: 'half',
    options: [
      { label: 'Active', value: 'ACTIVE' },
      { label: 'Inactive', value: 'INACTIVE' }
    ]
  },
  { name: 'salary', type: 'currency', wrapper: 'half' },
  { name: 'currency', hint: 'e.g. USD', wrapper: 'half' },
  { name: 'startDate', label: 'Start date', type: 'date' }
]

const {
  showCreate: showCreateEmployment,
  creating: creatingEmployment,
  error: employmentError,
  createForm: createEmploymentForm,
  openCreate: openCreateEmployment,
  onCreate: onCreateEmployment,
  showEdit: showEditEmployment,
  editing: editingEmployment,
  editError: editEmploymentError,
  editForm: editEmploymentForm,
  openEdit: openEditEmployment,
  onEdit: onEditEmployment,
  deleting: deletingEmployment,
  confirmDelete: confirmDeleteEmployment,
  onDelete: onDeleteEmployment
} = useCrudModals<CustomerEmploymentResponse, CustomerEmploymentRequest>(
  `/customers/${customerId}/employments`,
  refreshEmployments,
  {
    entityName: 'Employment',
    createDefaults: () => ({
      companyName: '',
      occupation: '',
      employmentType: undefined,
      status: 'ACTIVE',
      salary: undefined,
      currency: '',
      startDate: ''
    }),
    toForm: (row) => ({
      companyName: row.companyName,
      occupation: row.occupation ?? '',
      employmentType: row.employmentType,
      status: row.status,
      salary: row.salary ?? undefined,
      currency: row.currency ?? '',
      startDate: row.startDate ?? ''
    }),
    toPayload: (values) => ({
      companyName: values.companyName,
      occupation: values.occupation || undefined,
      employmentType: values.employmentType,
      status: values.status || undefined,
      salary: values.salary || undefined,
      currency: values.currency || undefined,
      startDate: values.startDate || undefined
    })
  }
)

const incomeColumns: ColumnDef<CustomerIncomeResponse>[] = [
  { key: 'incomeType', label: 'Type', type: 'enum' },
  {
    key: 'amount',
    value: (row) => `${row.amount.toLocaleString()}${row.currency ? ' ' + row.currency : ''}`
  },
  { key: 'frequency', type: 'enum' },
  { key: 'actions', label: '', class: 'text-right' }
]

const incomeFields: FieldDef[] = [
  {
    name: 'incomeType',
    label: 'Type',
    type: 'select',
    required: true,
    wrapper: 'half',
    options: [
      { label: 'Salary', value: 'SALARY' },
      { label: 'Business', value: 'BUSINESS' },
      { label: 'Rental', value: 'RENTAL' },
      { label: 'Investment', value: 'INVESTMENT' },
      { label: 'Pension', value: 'PENSION' },
      { label: 'Other', value: 'OTHER' }
    ]
  },
  {
    name: 'frequency',
    type: 'select',
    required: true,
    wrapper: 'half',
    options: [
      { label: 'Daily', value: 'DAILY' },
      { label: 'Weekly', value: 'WEEKLY' },
      { label: 'Biweekly', value: 'BIWEEKLY' },
      { label: 'Monthly', value: 'MONTHLY' },
      { label: 'Annually', value: 'ANNUALLY' }
    ]
  },
  { name: 'amount', type: 'currency', required: true, wrapper: 'half' },
  { name: 'currency', hint: 'e.g. USD', wrapper: 'half' }
]

const {
  showCreate: showCreateIncome,
  creating: creatingIncome,
  error: incomeError,
  createForm: createIncomeForm,
  openCreate: openCreateIncome,
  onCreate: onCreateIncome,
  showEdit: showEditIncome,
  editing: editingIncome,
  editError: editIncomeError,
  editForm: editIncomeForm,
  openEdit: openEditIncome,
  onEdit: onEditIncome,
  deleting: deletingIncome,
  confirmDelete: confirmDeleteIncome,
  onDelete: onDeleteIncome
} = useCrudModals<CustomerIncomeResponse, CustomerIncomeRequest>(
  `/customers/${customerId}/incomes`,
  refreshIncomes,
  {
    entityName: 'Income',
    createDefaults: () => ({
      incomeType: undefined,
      frequency: undefined,
      amount: undefined,
      currency: ''
    }),
    toForm: (row) => ({
      incomeType: row.incomeType,
      frequency: row.frequency,
      amount: row.amount,
      currency: row.currency ?? ''
    }),
    toPayload: (values) => ({
      incomeType: values.incomeType,
      frequency: values.frequency,
      amount: values.amount,
      currency: values.currency || undefined
    })
  }
)

const relationshipColumns: ColumnDef<CustomerRelationshipResponse>[] = [
  {
    key: 'relatedCustomerName',
    label: 'Related customer',
    type: 'link',
    href: (row) => `/customers/${row.relatedCustomerId}`
  },
  { key: 'relationshipType', label: 'Type', type: 'enum' },
  { key: 'actions', label: '', class: 'text-right' }
]

// Excludes this customer from the results — a customer can't relate to themselves.
async function searchOtherCustomers(query: string) {
  const result = await api<PageResponse<CustomerResponse>>('/customers', {
    query: { search: query, size: 20 }
  })
  return result.content
    .filter((c) => String(c.id) !== customerId)
    .map((c) => ({ label: `${c.firstName} ${c.lastName} (#${c.id})`, value: c.id }))
}

const relationshipFields: FieldDef[] = [
  {
    name: 'relatedCustomerId',
    label: 'Related customer',
    type: 'relationship',
    required: true,
    search: searchOtherCustomers,
    placeholder: 'Search customers…',
    wrapper: 'half'
  },
  {
    name: 'relationshipType',
    label: 'Type',
    type: 'select',
    required: true,
    wrapper: 'half',
    options: [
      { label: 'Spouse', value: 'SPOUSE' },
      { label: 'Parent', value: 'PARENT' },
      { label: 'Child', value: 'CHILD' },
      { label: 'Sibling', value: 'SIBLING' },
      { label: 'Business partner', value: 'BUSINESS_PARTNER' },
      { label: 'Guarantor', value: 'GUARANTOR' },
      { label: 'Other', value: 'OTHER' }
    ]
  }
]

const {
  showCreate: showCreateRelationship,
  creating: creatingRelationship,
  error: relationshipError,
  createForm: createRelationshipForm,
  openCreate: openCreateRelationship,
  onCreate: onCreateRelationship,
  showEdit: showEditRelationship,
  editing: editingRelationship,
  editError: editRelationshipError,
  editForm: editRelationshipForm,
  openEdit: openEditRelationship,
  onEdit: onEditRelationship,
  deleting: deletingRelationship,
  confirmDelete: confirmDeleteRelationship,
  onDelete: onDeleteRelationship
} = useCrudModals<CustomerRelationshipResponse, CustomerRelationshipRequest>(
  `/customers/${customerId}/relationships`,
  refreshRelationships,
  {
    entityName: 'Relationship',
    createDefaults: () => ({
      relatedCustomerId: undefined,
      relationshipType: undefined
    }),
    toForm: (row) => ({
      relatedCustomerId: row.relatedCustomerId,
      relationshipType: row.relationshipType
    }),
    toPayload: (values) => ({
      relatedCustomerId: values.relatedCustomerId,
      relationshipType: values.relationshipType
    })
  }
)

const riskProfileFields: FieldDef[] = [
  {
    name: 'riskLevel',
    label: 'Risk level',
    type: 'select',
    required: true,
    wrapper: 'half',
    options: [
      { label: 'Low', value: 'LOW' },
      { label: 'Medium', value: 'MEDIUM' },
      { label: 'High', value: 'HIGH' }
    ]
  },
  {
    name: 'amlStatus',
    label: 'AML status',
    type: 'select',
    required: true,
    wrapper: 'half',
    options: [
      { label: 'Clear', value: 'CLEAR' },
      { label: 'Flagged', value: 'FLAGGED' },
      { label: 'Under review', value: 'UNDER_REVIEW' }
    ]
  },
  {
    name: 'pep',
    label: 'Politically exposed person (PEP)',
    type: 'switch',
    wrapper: 'half',
    onLabel: 'Yes',
    offLabel: 'No'
  },
  {
    name: 'sanctionChecked',
    label: 'Sanctions screening completed',
    type: 'switch',
    wrapper: 'half',
    onLabel: 'Yes',
    offLabel: 'No'
  },
  { name: 'lastReviewDate', label: 'Last review date', type: 'date', max: today }
]

// Singleton, so the form is seeded once from whatever GET /risk-profile
// returned at page load rather than opened via a create/edit modal.
// `any` matches DynamicForm's own model type (Record<string, any>).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const riskProfileForm = ref<Record<string, any>>({
  riskLevel: riskProfile.value?.riskLevel ?? undefined,
  amlStatus: riskProfile.value?.amlStatus ?? undefined,
  pep: riskProfile.value?.pep ?? false,
  sanctionChecked: riskProfile.value?.sanctionChecked ?? false,
  lastReviewDate: riskProfile.value?.lastReviewDate ?? ''
})

const savingRiskProfile = ref(false)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function onSaveRiskProfile(values: Record<string, any>) {
  savingRiskProfile.value = true
  try {
    const payload: CustomerRiskProfileRequest = {
      riskLevel: values.riskLevel,
      amlStatus: values.amlStatus,
      pep: !!values.pep,
      sanctionChecked: !!values.sanctionChecked,
      lastReviewDate: values.lastReviewDate || undefined
    }
    await api(`/customers/${customerId}/risk-profile`, { method: 'PUT', body: payload })
    toast.add({ title: 'Risk profile saved', color: 'green' })
    await refreshRiskProfile()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    savingRiskProfile.value = false
  }
}

const preferenceFields: FieldDef[] = [
  { name: 'language', hint: 'e.g. en, km', wrapper: 'half' },
  { name: 'currency', hint: 'e.g. USD', wrapper: 'half' },
  {
    name: 'notificationMethod',
    label: 'Notification method',
    type: 'select',
    required: true,
    options: [
      { label: 'Email', value: 'EMAIL' },
      { label: 'SMS', value: 'SMS' },
      { label: 'Phone', value: 'PHONE' },
      { label: 'None', value: 'NONE' }
    ]
  }
]

// Singleton, so the form is seeded once from whatever GET /preferences
// returned at page load rather than opened via a create/edit modal.
// `any` matches DynamicForm's own model type (Record<string, any>).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const preferenceForm = ref<Record<string, any>>({
  language: preferences.value?.language ?? '',
  currency: preferences.value?.currency ?? '',
  notificationMethod: preferences.value?.notificationMethod ?? undefined
})

const savingPreferences = ref(false)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function onSavePreferences(values: Record<string, any>) {
  savingPreferences.value = true
  try {
    const payload: CustomerPreferenceRequest = {
      language: values.language || undefined,
      currency: values.currency || undefined,
      notificationMethod: values.notificationMethod
    }
    await api(`/customers/${customerId}/preferences`, { method: 'PUT', body: payload })
    toast.add({ title: 'Preferences saved', color: 'green' })
    await refreshPreferences()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    savingPreferences.value = false
  }
}

const auditLogColumns: ColumnDef<CustomerAuditLogResponse>[] = [
  { key: 'createdAt', label: 'When', type: 'datetime' },
  { key: 'action' },
  { key: 'userId', label: 'User ID' },
  { key: 'oldValue', label: 'Old value' },
  { key: 'newValue', label: 'New value' }
]

async function onUpdate(payload: CustomerRequest) {
  saving.value = true
  try {
    await api(`/customers/${customerId}`, { method: 'PUT', body: payload })
    toast.add({ title: 'Customer updated', color: 'green' })
    await refresh()
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
  } finally {
    saving.value = false
  }
}

async function onDelete() {
  deleting.value = true
  try {
    await api(`/customers/${customerId}`, { method: 'DELETE' })
    toast.add({ title: 'Customer deleted', color: 'green' })
    await router.push('/customers')
  } catch (err) {
    toast.add({ title: apiErrorMessage(err), color: 'red' })
    confirmDelete.value = false
  } finally {
    deleting.value = false
  }
}
</script>
