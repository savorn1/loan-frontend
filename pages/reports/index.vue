<template>
  <div>
    <PageHeader :title="t('admin.reports.title')" :description="t('admin.reports.description')" />

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <template v-if="loading">
        <UCard v-for="i in 4" :key="i">
          <div class="flex items-center gap-4">
            <USkeleton class="w-10 h-10 rounded-lg shrink-0" />
            <div class="min-w-0 flex-1 space-y-2">
              <USkeleton class="h-3 w-20" />
              <USkeleton class="h-6 w-16" />
            </div>
          </div>
        </UCard>
      </template>
      <template v-else>
        <UCard v-for="tile in statTiles" :key="tile.label">
          <div class="flex items-center gap-4">
            <div class="shrink-0 rounded-xl p-2.5 text-white shadow-sm" :class="tile.iconBg">
              <UIcon :name="tile.icon" class="w-5 h-5" />
            </div>
            <div class="min-w-0">
              <div class="text-sm text-gray-500 dark:text-gray-400">{{ tile.label }}</div>
              <div class="text-2xl font-semibold text-gray-900 dark:text-white">
                {{ tile.value }}
              </div>
            </div>
          </div>
        </UCard>
      </template>
    </div>

    <UCard class="mb-6">
      <template #header>
        <span class="font-semibold">{{ t('admin.reports.loansByStatusHeader') }}</span>
      </template>
      <div v-if="loading" class="h-24">
        <USkeleton class="w-full h-full" />
      </div>
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div
          v-for="s in statusBreakdown"
          :key="s.status"
          class="rounded-lg border border-gray-100 dark:border-gray-800 p-4"
        >
          <StatusBadge :status="s.status" class="mb-2" />
          <div class="text-xl font-semibold text-gray-900 dark:text-white">
            {{ formatCurrency(s.totalPrincipal) }}
          </div>
          <div class="text-xs text-gray-500 dark:text-gray-400">
            {{ s.loanCount === 1 ? t('admin.reports.loanCount.one') : t('admin.reports.loanCount.other', { count: s.loanCount }) }}
          </div>
        </div>
      </div>
    </UCard>

    <UCard class="mb-6">
      <template #header>
        <span class="font-semibold">{{ t('admin.reports.parByBucketHeader') }}</span>
      </template>
      <div v-if="loading" class="h-32">
        <USkeleton class="w-full h-full" />
      </div>
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          v-for="b in parSummary?.buckets ?? []"
          :key="b.bucket"
          class="rounded-lg border border-gray-100 dark:border-gray-800 p-4"
        >
          <UBadge :color="bucketColor(b.bucket)" variant="subtle" class="mb-2">{{
            bucketLabel(b.bucket)
          }}</UBadge>
          <div class="text-xl font-semibold text-gray-900 dark:text-white">
            {{ formatCurrency(b.overdueAmount) }}
          </div>
          <div class="text-xs text-gray-500 dark:text-gray-400">
            {{ b.loanCount === 1 ? t('admin.reports.loanCount.one') : t('admin.reports.loanCount.other', { count: b.loanCount }) }}
          </div>
        </div>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <span class="font-semibold">{{ t('admin.reports.trendsHeader') }}</span>
      </template>
      <div v-if="loading" class="h-64">
        <USkeleton class="w-full h-full" />
      </div>
      <div v-else class="h-64">
        <ClientOnly>
          <Line :data="trendChartData" :options="trendChartOptions" />
        </ClientOnly>
      </div>
    </UCard>

    <UCard class="mt-6">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <span class="font-semibold">{{ t('admin.reports.generalLedgerReportsHeader') }}</span>
          <UInput
            v-model="generalLedgerReportSearch"
            icon="i-heroicons-magnifying-glass"
            size="sm"
            class="w-56"
            :placeholder="t('common.searchEllipsis')"
          />
        </div>
      </template>
      <DataTable
        :rows="filteredGeneralLedgerReportTiles"
        :columns="reportColumns"
        :exportable="false"
        @select="(row: GeneralLedgerReportTile) => router.push(row.to)"
      >
        <template #label-data="{ row }">
          <div class="flex items-center gap-3">
            <div class="shrink-0 rounded-lg p-2 bg-primary-50 dark:bg-primary-400/10 text-primary-500 dark:text-primary-300">
              <UIcon :name="row.icon" class="w-5 h-5" />
            </div>
            <span class="font-medium text-gray-900 dark:text-white">{{ row.label }}</span>
          </div>
        </template>
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-magnifying-glass"
            :title="t('common.noMatches')"
            :description="t('common.nothingMatches', { query: generalLedgerReportSearch })"
          />
        </template>
      </DataTable>
    </UCard>

    <UCard class="mt-6">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <span class="font-semibold">{{ t('admin.reports.trialBalanceReportsHeader') }}</span>
          <UInput
            v-model="trialBalanceReportSearch"
            icon="i-heroicons-magnifying-glass"
            size="sm"
            class="w-56"
            :placeholder="t('common.searchEllipsis')"
          />
        </div>
      </template>
      <DataTable
        :rows="filteredTrialBalanceReportTiles"
        :columns="reportColumns"
        :exportable="false"
        @select="(row: GeneralLedgerReportTile) => router.push(row.to)"
      >
        <template #label-data="{ row }">
          <div class="flex items-center gap-3">
            <div class="shrink-0 rounded-lg p-2 bg-primary-50 dark:bg-primary-400/10 text-primary-500 dark:text-primary-300">
              <UIcon :name="row.icon" class="w-5 h-5" />
            </div>
            <span class="font-medium text-gray-900 dark:text-white">{{ row.label }}</span>
          </div>
        </template>
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-magnifying-glass"
            :title="t('common.noMatches')"
            :description="t('common.nothingMatches', { query: trialBalanceReportSearch })"
          />
        </template>
      </DataTable>
    </UCard>

    <UCard class="mt-6">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <span class="font-semibold">{{ t('admin.reports.financialStatementsHeader') }}</span>
          <UInput
            v-model="financialStatementsSearch"
            icon="i-heroicons-magnifying-glass"
            size="sm"
            class="w-56"
            :placeholder="t('common.searchEllipsis')"
          />
        </div>
      </template>
      <DataTable
        :rows="filteredFinancialStatementTiles"
        :columns="reportColumns"
        :exportable="false"
        @select="(row: GeneralLedgerReportTile) => router.push(row.to)"
      >
        <template #label-data="{ row }">
          <div class="flex items-center gap-3">
            <div class="shrink-0 rounded-lg p-2 bg-primary-50 dark:bg-primary-400/10 text-primary-500 dark:text-primary-300">
              <UIcon :name="row.icon" class="w-5 h-5" />
            </div>
            <span class="font-medium text-gray-900 dark:text-white">{{ row.label }}</span>
          </div>
        </template>
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-magnifying-glass"
            :title="t('common.noMatches')"
            :description="t('common.nothingMatches', { query: financialStatementsSearch })"
          />
        </template>
      </DataTable>
    </UCard>

    <UCard class="mt-6">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <span class="font-semibold">{{ t('admin.reports.loanAccountingReportsHeader') }}</span>
          <UInput
            v-model="loanAccountingReportSearch"
            icon="i-heroicons-magnifying-glass"
            size="sm"
            class="w-56"
            :placeholder="t('common.searchEllipsis')"
          />
        </div>
      </template>
      <DataTable
        :rows="filteredLoanAccountingReportTiles"
        :columns="reportColumns"
        :exportable="false"
        @select="(row: GeneralLedgerReportTile) => router.push(row.to)"
      >
        <template #label-data="{ row }">
          <div class="flex items-center gap-3">
            <div class="shrink-0 rounded-lg p-2 bg-primary-50 dark:bg-primary-400/10 text-primary-500 dark:text-primary-300">
              <UIcon :name="row.icon" class="w-5 h-5" />
            </div>
            <span class="font-medium text-gray-900 dark:text-white">{{ row.label }}</span>
          </div>
        </template>
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-magnifying-glass"
            :title="t('common.noMatches')"
            :description="t('common.nothingMatches', { query: loanAccountingReportSearch })"
          />
        </template>
      </DataTable>
    </UCard>

    <UCard class="mt-6">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <span class="font-semibold">{{ t('admin.reports.receivablesReportsHeader') }}</span>
          <UInput
            v-model="receivablesReportSearch"
            icon="i-heroicons-magnifying-glass"
            size="sm"
            class="w-56"
            :placeholder="t('common.searchEllipsis')"
          />
        </div>
      </template>
      <DataTable
        :rows="filteredReceivablesReportTiles"
        :columns="reportColumns"
        :exportable="false"
        @select="(row: GeneralLedgerReportTile) => router.push(row.to)"
      >
        <template #label-data="{ row }">
          <div class="flex items-center gap-3">
            <div class="shrink-0 rounded-lg p-2 bg-primary-50 dark:bg-primary-400/10 text-primary-500 dark:text-primary-300">
              <UIcon :name="row.icon" class="w-5 h-5" />
            </div>
            <span class="font-medium text-gray-900 dark:text-white">{{ row.label }}</span>
          </div>
        </template>
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-magnifying-glass"
            :title="t('common.noMatches')"
            :description="t('common.nothingMatches', { query: receivablesReportSearch })"
          />
        </template>
      </DataTable>
    </UCard>

    <UCard class="mt-6">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <span class="font-semibold">{{ t('admin.reports.cashReportsHeader') }}</span>
          <UInput
            v-model="cashReportSearch"
            icon="i-heroicons-magnifying-glass"
            size="sm"
            class="w-56"
            :placeholder="t('common.searchEllipsis')"
          />
        </div>
      </template>
      <DataTable
        :rows="filteredCashReportTiles"
        :columns="reportColumns"
        :exportable="false"
        @select="(row: GeneralLedgerReportTile) => router.push(row.to)"
      >
        <template #label-data="{ row }">
          <div class="flex items-center gap-3">
            <div class="shrink-0 rounded-lg p-2 bg-primary-50 dark:bg-primary-400/10 text-primary-500 dark:text-primary-300">
              <UIcon :name="row.icon" class="w-5 h-5" />
            </div>
            <span class="font-medium text-gray-900 dark:text-white">{{ row.label }}</span>
          </div>
        </template>
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-magnifying-glass"
            :title="t('common.noMatches')"
            :description="t('common.nothingMatches', { query: cashReportSearch })"
          />
        </template>
      </DataTable>
    </UCard>

    <UCard class="mt-6">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <span class="font-semibold">{{ t('admin.reports.branchAccountingReportsHeader') }}</span>
          <UInput
            v-model="branchAccountingReportSearch"
            icon="i-heroicons-magnifying-glass"
            size="sm"
            class="w-56"
            :placeholder="t('common.searchEllipsis')"
          />
        </div>
      </template>
      <DataTable
        :rows="filteredBranchAccountingReportTiles"
        :columns="reportColumns"
        :exportable="false"
        @select="(row: GeneralLedgerReportTile) => router.push(row.to)"
      >
        <template #label-data="{ row }">
          <div class="flex items-center gap-3">
            <div class="shrink-0 rounded-lg p-2 bg-primary-50 dark:bg-primary-400/10 text-primary-500 dark:text-primary-300">
              <UIcon :name="row.icon" class="w-5 h-5" />
            </div>
            <span class="font-medium text-gray-900 dark:text-white">{{ row.label }}</span>
          </div>
        </template>
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-magnifying-glass"
            :title="t('common.noMatches')"
            :description="t('common.nothingMatches', { query: branchAccountingReportSearch })"
          />
        </template>
      </DataTable>
    </UCard>

    <UCard class="mt-6">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <span class="font-semibold">{{ t('admin.reports.expenseReportsHeader') }}</span>
          <UInput
            v-model="expenseReportSearch"
            icon="i-heroicons-magnifying-glass"
            size="sm"
            class="w-56"
            :placeholder="t('common.searchEllipsis')"
          />
        </div>
      </template>
      <DataTable
        :rows="filteredExpenseReportTiles"
        :columns="reportColumns"
        :exportable="false"
        @select="(row: GeneralLedgerReportTile) => router.push(row.to)"
      >
        <template #label-data="{ row }">
          <div class="flex items-center gap-3">
            <div class="shrink-0 rounded-lg p-2 bg-primary-50 dark:bg-primary-400/10 text-primary-500 dark:text-primary-300">
              <UIcon :name="row.icon" class="w-5 h-5" />
            </div>
            <span class="font-medium text-gray-900 dark:text-white">{{ row.label }}</span>
          </div>
        </template>
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-magnifying-glass"
            :title="t('common.noMatches')"
            :description="t('common.nothingMatches', { query: expenseReportSearch })"
          />
        </template>
      </DataTable>
    </UCard>

    <UCard class="mt-6">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <span class="font-semibold">{{ t('admin.reports.revenueReportsHeader') }}</span>
          <UInput
            v-model="revenueReportSearch"
            icon="i-heroicons-magnifying-glass"
            size="sm"
            class="w-56"
            :placeholder="t('common.searchEllipsis')"
          />
        </div>
      </template>
      <DataTable
        :rows="filteredRevenueReportTiles"
        :columns="reportColumns"
        :exportable="false"
        @select="(row: GeneralLedgerReportTile) => router.push(row.to)"
      >
        <template #label-data="{ row }">
          <div class="flex items-center gap-3">
            <div class="shrink-0 rounded-lg p-2 bg-primary-50 dark:bg-primary-400/10 text-primary-500 dark:text-primary-300">
              <UIcon :name="row.icon" class="w-5 h-5" />
            </div>
            <span class="font-medium text-gray-900 dark:text-white">{{ row.label }}</span>
          </div>
        </template>
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-magnifying-glass"
            :title="t('common.noMatches')"
            :description="t('common.nothingMatches', { query: revenueReportSearch })"
          />
        </template>
      </DataTable>
    </UCard>

    <UCard class="mt-6">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <span class="font-semibold">{{ t('admin.reports.loanPortfolioReportsHeader') }}</span>
          <UInput
            v-model="loanPortfolioReportSearch"
            icon="i-heroicons-magnifying-glass"
            size="sm"
            class="w-56"
            :placeholder="t('common.searchEllipsis')"
          />
        </div>
      </template>
      <DataTable
        :rows="filteredLoanPortfolioReportTiles"
        :columns="reportColumns"
        :exportable="false"
        @select="(row: GeneralLedgerReportTile) => router.push(row.to)"
      >
        <template #label-data="{ row }">
          <div class="flex items-center gap-3">
            <div class="shrink-0 rounded-lg p-2 bg-primary-50 dark:bg-primary-400/10 text-primary-500 dark:text-primary-300">
              <UIcon :name="row.icon" class="w-5 h-5" />
            </div>
            <span class="font-medium text-gray-900 dark:text-white">{{ row.label }}</span>
          </div>
        </template>
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-magnifying-glass"
            :title="t('common.noMatches')"
            :description="t('common.nothingMatches', { query: loanPortfolioReportSearch })"
          />
        </template>
      </DataTable>
    </UCard>

    <UCard class="mt-6">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <span class="font-semibold">{{ t('admin.reports.repaymentReportsHeader') }}</span>
          <UInput
            v-model="repaymentReportSearch"
            icon="i-heroicons-magnifying-glass"
            size="sm"
            class="w-56"
            :placeholder="t('common.searchEllipsis')"
          />
        </div>
      </template>
      <DataTable
        :rows="filteredRepaymentReportTiles"
        :columns="reportColumns"
        :exportable="false"
        @select="(row: GeneralLedgerReportTile) => router.push(row.to)"
      >
        <template #label-data="{ row }">
          <div class="flex items-center gap-3">
            <div class="shrink-0 rounded-lg p-2 bg-primary-50 dark:bg-primary-400/10 text-primary-500 dark:text-primary-300">
              <UIcon :name="row.icon" class="w-5 h-5" />
            </div>
            <span class="font-medium text-gray-900 dark:text-white">{{ row.label }}</span>
          </div>
        </template>
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-magnifying-glass"
            :title="t('common.noMatches')"
            :description="t('common.nothingMatches', { query: repaymentReportSearch })"
          />
        </template>
      </DataTable>
    </UCard>

    <UCard class="mt-6">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <span class="font-semibold">{{ t('admin.reports.outstandingReportsHeader') }}</span>
          <UInput
            v-model="outstandingReportSearch"
            icon="i-heroicons-magnifying-glass"
            size="sm"
            class="w-56"
            :placeholder="t('common.searchEllipsis')"
          />
        </div>
      </template>
      <DataTable
        :rows="filteredOutstandingReportTiles"
        :columns="reportColumns"
        :exportable="false"
        @select="(row: GeneralLedgerReportTile) => router.push(row.to)"
      >
        <template #label-data="{ row }">
          <div class="flex items-center gap-3">
            <div class="shrink-0 rounded-lg p-2 bg-primary-50 dark:bg-primary-400/10 text-primary-500 dark:text-primary-300">
              <UIcon :name="row.icon" class="w-5 h-5" />
            </div>
            <span class="font-medium text-gray-900 dark:text-white">{{ row.label }}</span>
          </div>
        </template>
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-magnifying-glass"
            :title="t('common.noMatches')"
            :description="t('common.nothingMatches', { query: outstandingReportSearch })"
          />
        </template>
      </DataTable>
    </UCard>

    <UCard class="mt-6">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <span class="font-semibold">{{ t('admin.reports.overdueReportsHeader') }}</span>
          <UInput
            v-model="overdueReportSearch"
            icon="i-heroicons-magnifying-glass"
            size="sm"
            class="w-56"
            :placeholder="t('common.searchEllipsis')"
          />
        </div>
      </template>
      <DataTable
        :rows="filteredOverdueReportTiles"
        :columns="reportColumns"
        :exportable="false"
        @select="(row: GeneralLedgerReportTile) => router.push(row.to)"
      >
        <template #label-data="{ row }">
          <div class="flex items-center gap-3">
            <div class="shrink-0 rounded-lg p-2 bg-primary-50 dark:bg-primary-400/10 text-primary-500 dark:text-primary-300">
              <UIcon :name="row.icon" class="w-5 h-5" />
            </div>
            <span class="font-medium text-gray-900 dark:text-white">{{ row.label }}</span>
          </div>
        </template>
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-magnifying-glass"
            :title="t('common.noMatches')"
            :description="t('common.nothingMatches', { query: overdueReportSearch })"
          />
        </template>
      </DataTable>
    </UCard>

    <UCard class="mt-6">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <span class="font-semibold">{{ t('admin.reports.penaltyReportsHeader') }}</span>
          <UInput
            v-model="penaltyReportSearch"
            icon="i-heroicons-magnifying-glass"
            size="sm"
            class="w-56"
            :placeholder="t('common.searchEllipsis')"
          />
        </div>
      </template>
      <DataTable
        :rows="filteredPenaltyReportTiles"
        :columns="reportColumns"
        :exportable="false"
        @select="(row: GeneralLedgerReportTile) => router.push(row.to)"
      >
        <template #label-data="{ row }">
          <div class="flex items-center gap-3">
            <div class="shrink-0 rounded-lg p-2 bg-primary-50 dark:bg-primary-400/10 text-primary-500 dark:text-primary-300">
              <UIcon :name="row.icon" class="w-5 h-5" />
            </div>
            <span class="font-medium text-gray-900 dark:text-white">{{ row.label }}</span>
          </div>
        </template>
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-magnifying-glass"
            :title="t('common.noMatches')"
            :description="t('common.nothingMatches', { query: penaltyReportSearch })"
          />
        </template>
      </DataTable>
    </UCard>

    <UCard class="mt-6">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <span class="font-semibold">{{ t('admin.reports.interestReportsHeader') }}</span>
          <UInput
            v-model="interestReportSearch"
            icon="i-heroicons-magnifying-glass"
            size="sm"
            class="w-56"
            :placeholder="t('common.searchEllipsis')"
          />
        </div>
      </template>
      <DataTable
        :rows="filteredInterestReportTiles"
        :columns="reportColumns"
        :exportable="false"
        @select="(row: GeneralLedgerReportTile) => router.push(row.to)"
      >
        <template #label-data="{ row }">
          <div class="flex items-center gap-3">
            <div class="shrink-0 rounded-lg p-2 bg-primary-50 dark:bg-primary-400/10 text-primary-500 dark:text-primary-300">
              <UIcon :name="row.icon" class="w-5 h-5" />
            </div>
            <span class="font-medium text-gray-900 dark:text-white">{{ row.label }}</span>
          </div>
        </template>
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-magnifying-glass"
            :title="t('common.noMatches')"
            :description="t('common.nothingMatches', { query: interestReportSearch })"
          />
        </template>
      </DataTable>
    </UCard>

    <UCard class="mt-6">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <span class="font-semibold">{{ t('admin.reports.customerReportsHeader') }}</span>
          <UInput
            v-model="customerReportSearch"
            icon="i-heroicons-magnifying-glass"
            size="sm"
            class="w-56"
            :placeholder="t('common.searchEllipsis')"
          />
        </div>
      </template>
      <DataTable
        :rows="filteredCustomerReportTiles"
        :columns="reportColumns"
        :exportable="false"
        @select="(row: GeneralLedgerReportTile) => router.push(row.to)"
      >
        <template #label-data="{ row }">
          <div class="flex items-center gap-3">
            <div class="shrink-0 rounded-lg p-2 bg-primary-50 dark:bg-primary-400/10 text-primary-500 dark:text-primary-300">
              <UIcon :name="row.icon" class="w-5 h-5" />
            </div>
            <span class="font-medium text-gray-900 dark:text-white">{{ row.label }}</span>
          </div>
        </template>
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-magnifying-glass"
            :title="t('common.noMatches')"
            :description="t('common.nothingMatches', { query: customerReportSearch })"
          />
        </template>
      </DataTable>
    </UCard>

    <UCard class="mt-6">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <span class="font-semibold">{{ t('admin.reports.scheduleReportsHeader') }}</span>
          <UInput
            v-model="scheduleReportSearch"
            icon="i-heroicons-magnifying-glass"
            size="sm"
            class="w-56"
            :placeholder="t('common.searchEllipsis')"
          />
        </div>
      </template>
      <DataTable
        :rows="filteredScheduleReportTiles"
        :columns="reportColumns"
        :exportable="false"
        @select="(row: GeneralLedgerReportTile) => router.push(row.to)"
      >
        <template #label-data="{ row }">
          <div class="flex items-center gap-3">
            <div class="shrink-0 rounded-lg p-2 bg-primary-50 dark:bg-primary-400/10 text-primary-500 dark:text-primary-300">
              <UIcon :name="row.icon" class="w-5 h-5" />
            </div>
            <span class="font-medium text-gray-900 dark:text-white">{{ row.label }}</span>
          </div>
        </template>
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-magnifying-glass"
            :title="t('common.noMatches')"
            :description="t('common.nothingMatches', { query: scheduleReportSearch })"
          />
        </template>
      </DataTable>
    </UCard>

    <UCard class="mt-6">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <span class="font-semibold">{{ t('admin.reports.writeoffRestructureReportsHeader') }}</span>
          <UInput
            v-model="writeoffRestructureReportSearch"
            icon="i-heroicons-magnifying-glass"
            size="sm"
            class="w-56"
            :placeholder="t('common.searchEllipsis')"
          />
        </div>
      </template>
      <DataTable
        :rows="filteredWriteoffRestructureReportTiles"
        :columns="reportColumns"
        :exportable="false"
        @select="(row: GeneralLedgerReportTile) => router.push(row.to)"
      >
        <template #label-data="{ row }">
          <div class="flex items-center gap-3">
            <div class="shrink-0 rounded-lg p-2 bg-primary-50 dark:bg-primary-400/10 text-primary-500 dark:text-primary-300">
              <UIcon :name="row.icon" class="w-5 h-5" />
            </div>
            <span class="font-medium text-gray-900 dark:text-white">{{ row.label }}</span>
          </div>
        </template>
        <template #empty-state>
          <EmptyState
            icon="i-heroicons-magnifying-glass"
            :title="t('common.noMatches')"
            :description="t('common.nothingMatches', { query: writeoffRestructureReportSearch })"
          />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  type TooltipItem
} from 'chart.js'
import { Line } from 'vue-chartjs'
import type { CollectionBucket } from '~/features/collections/types'
import type { LoanStatus } from '~/features/loans/types'
import type { ColumnDef } from '~/shared/types'
import type {
  CollectionTrendPoint,
  DisbursementTrendPoint,
  LoanStatusBreakdown,
  ParSummaryResponse,
  PortfolioSummaryResponse
} from '~/features/reports/types'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

const { t } = useI18n()
const api = useApi()
const router = useRouter()
const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

const [
  { data: portfolio, pending: p1 },
  { data: disbursementTrend, pending: p2 },
  { data: parSummary, pending: p3 },
  { data: collectionTrend, pending: p4 },
  { data: statusBreakdownRaw, pending: p5 }
] = await Promise.all([
  useAsyncData('reports-portfolio', () => api<PortfolioSummaryResponse>('/loans/reports/portfolio-summary')),
  useAsyncData('reports-disbursement-trend', () =>
    api<DisbursementTrendPoint[]>('/loans/reports/disbursement-trend')
  ),
  useAsyncData('reports-par-summary', () => api<ParSummaryResponse>('/payments/reports/par-summary')),
  useAsyncData('reports-collection-trend', () =>
    api<CollectionTrendPoint[]>('/payments/reports/collection-trend')
  ),
  useAsyncData('reports-status-breakdown', () =>
    api<LoanStatusBreakdown[]>('/loans/reports/status-breakdown')
  )
])

const loading = computed(() => p1.value && p2.value && p3.value && p4.value && p5.value)

const STATUS_ORDER: LoanStatus[] = ['PENDING', 'APPROVED', 'ACTIVE', 'CLOSED', 'REJECTED']
const statusBreakdown = computed(() =>
  [...(statusBreakdownRaw.value ?? [])].sort(
    (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
  )
)

const BUCKET_META: Record<CollectionBucket, { labelKey: string; color: string }> = {
  DPD_1_30: { labelKey: 'admin.reports.buckets.dpd1_30', color: 'orange' },
  DPD_31_60: { labelKey: 'admin.reports.buckets.dpd31_60', color: 'orange' },
  DPD_61_90: { labelKey: 'admin.reports.buckets.dpd61_90', color: 'red' },
  DPD_90_PLUS: { labelKey: 'admin.reports.buckets.dpd90plus', color: 'red' }
}
function bucketLabel(bucket: CollectionBucket) {
  return t(BUCKET_META[bucket].labelKey)
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function bucketColor(bucket: CollectionBucket): any {
  return BUCKET_META[bucket].color
}

const statTiles = computed(() => {
  const parPct = parSummary.value?.portfolioAtRiskPercent ?? 0
  return [
    {
      label: t('admin.reports.statTiles.activeLoans'),
      value: portfolio.value?.activeLoanCount ?? 0,
      icon: 'i-heroicons-banknotes',
      iconBg: 'bg-gradient-to-br from-indigo-400 to-violet-500'
    },
    {
      label: t('admin.reports.statTiles.totalPrincipal'),
      value: formatCurrency(portfolio.value?.totalPrincipal ?? 0),
      icon: 'i-heroicons-currency-dollar',
      iconBg: 'bg-gradient-to-br from-sky-400 to-blue-500'
    },
    {
      label: t('admin.reports.statTiles.totalOutstanding'),
      value: formatCurrency(portfolio.value?.totalOutstandingBalance ?? 0),
      icon: 'i-heroicons-scale',
      iconBg: 'bg-gradient-to-br from-emerald-400 to-teal-500'
    },
    {
      label: t('admin.reports.statTiles.portfolioAtRisk'),
      value: `${parPct.toFixed(1)}%`,
      icon: 'i-heroicons-shield-exclamation',
      iconBg:
        parPct > 10
          ? 'bg-gradient-to-br from-rose-400 to-red-500'
          : 'bg-gradient-to-br from-fuchsia-400 to-pink-500'
    }
  ]
})

// Last 6 calendar months (oldest first), matching the "YYYY-MM" key the
// backend groups by — same fixed 6-month window as the dashboard's own trend.
const trendMonths = computed(() => {
  const now = new Date()
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    return { key, label: d.toLocaleDateString('en-US', { month: 'short' }) }
  })
})

function seriesFor<T extends { month: string }>(points: T[] | null | undefined, valueKey: keyof T) {
  const map = new Map((points ?? []).map((p) => [p.month, Number(p[valueKey])]))
  return trendMonths.value.map((m) => map.get(m.key) ?? 0)
}

const trendChartData = computed(() => ({
  labels: trendMonths.value.map((m) => m.label),
  datasets: [
    {
      label: t('admin.reports.chartLegend.disbursed'),
      data: seriesFor(disbursementTrend.value, 'totalDisbursed'),
      borderColor: '#6366f1',
      backgroundColor: '#6366f1',
      tension: 0.35,
      pointRadius: 3
    },
    {
      label: t('admin.reports.chartLegend.collected'),
      data: seriesFor(collectionTrend.value, 'totalCollected'),
      borderColor: '#14b8a6',
      backgroundColor: '#14b8a6',
      tension: 0.35,
      pointRadius: 3
    }
  ]
}))

interface GeneralLedgerReportTile {
  to: string
  icon: string
  label: string
  description: string
}

const generalLedgerReportTiles = computed<GeneralLedgerReportTile[]>(() => [
  {
    to: '/reports/general-ledger',
    icon: 'i-heroicons-book-open',
    label: t('admin.reports.generalLedgerReportsTiles.generalLedger.label'),
    description: t('admin.reports.generalLedgerReportsTiles.generalLedger.description')
  },
  {
    to: '/reports/general-ledger/journal-report',
    icon: 'i-heroicons-document-text',
    label: t('admin.reports.generalLedgerReportsTiles.journalReport.label'),
    description: t('admin.reports.generalLedgerReportsTiles.journalReport.description')
  },
  {
    to: '/reports/general-ledger/journal-entry-details',
    icon: 'i-heroicons-magnifying-glass',
    label: t('admin.reports.generalLedgerReportsTiles.journalEntryDetails.label'),
    description: t('admin.reports.generalLedgerReportsTiles.journalEntryDetails.description')
  },
  {
    to: '/general-ledger',
    icon: 'i-heroicons-calculator',
    label: t('admin.reports.generalLedgerReportsTiles.ledgerByAccount.label'),
    description: t('admin.reports.generalLedgerReportsTiles.ledgerByAccount.description')
  },
  {
    to: '/reports/general-ledger/ledger-by-branch',
    icon: 'i-heroicons-building-office-2',
    label: t('admin.reports.generalLedgerReportsTiles.ledgerByBranch.label'),
    description: t('admin.reports.generalLedgerReportsTiles.ledgerByBranch.description')
  },
  {
    to: '/reports/general-ledger/ledger-by-date-range',
    icon: 'i-heroicons-calendar-days',
    label: t('admin.reports.generalLedgerReportsTiles.ledgerByDateRange.label'),
    description: t('admin.reports.generalLedgerReportsTiles.ledgerByDateRange.description')
  },
  {
    to: '/reports/general-ledger/account-transaction-history',
    icon: 'i-heroicons-clock',
    label: t('admin.reports.generalLedgerReportsTiles.accountTransactionHistory.label'),
    description: t('admin.reports.generalLedgerReportsTiles.accountTransactionHistory.description')
  }
])

const trialBalanceReportTiles = computed<GeneralLedgerReportTile[]>(() => [
  {
    to: '/trial-balance',
    icon: 'i-heroicons-scale',
    label: t('admin.reports.trialBalanceReportsTiles.trialBalance.label'),
    description: t('admin.reports.trialBalanceReportsTiles.trialBalance.description')
  },
  {
    to: '/reports/trial-balance/adjusted',
    icon: 'i-heroicons-adjustments-horizontal',
    label: t('admin.reports.trialBalanceReportsTiles.adjustedTrialBalance.label'),
    description: t('admin.reports.trialBalanceReportsTiles.adjustedTrialBalance.description')
  },
  {
    to: '/reports/trial-balance/closing',
    icon: 'i-heroicons-lock-closed',
    label: t('admin.reports.trialBalanceReportsTiles.closingTrialBalance.label'),
    description: t('admin.reports.trialBalanceReportsTiles.closingTrialBalance.description')
  }
])

function filterReportTiles(tiles: GeneralLedgerReportTile[], query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return tiles
  return tiles.filter((t) => t.label.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))
}

const generalLedgerReportSearch = ref('')
const filteredGeneralLedgerReportTiles = computed(() =>
  filterReportTiles(generalLedgerReportTiles.value, generalLedgerReportSearch.value)
)

const trialBalanceReportSearch = ref('')
const filteredTrialBalanceReportTiles = computed(() =>
  filterReportTiles(trialBalanceReportTiles.value, trialBalanceReportSearch.value)
)

// "Financial Position Report" is the same statement as "Balance Sheet" under a different
// (IFRS) name — both tiles link to the same page rather than duplicating the report.
const financialStatementTiles = computed<GeneralLedgerReportTile[]>(() => [
  {
    to: '/reports/financial-statements/balance-sheet',
    icon: 'i-heroicons-scale',
    label: t('admin.reports.financialStatementsTiles.balanceSheet.label'),
    description: t('admin.reports.financialStatementsTiles.balanceSheet.description')
  },
  {
    to: '/reports/financial-statements/income-statement',
    icon: 'i-heroicons-chart-bar',
    label: t('admin.reports.financialStatementsTiles.incomeStatement.label'),
    description: t('admin.reports.financialStatementsTiles.incomeStatement.description')
  },
  {
    to: '/reports/financial-statements/cash-flow',
    icon: 'i-heroicons-banknotes',
    label: t('admin.reports.financialStatementsTiles.cashFlow.label'),
    description: t('admin.reports.financialStatementsTiles.cashFlow.description')
  },
  {
    to: '/reports/financial-statements/changes-in-equity',
    icon: 'i-heroicons-arrow-trending-up',
    label: t('admin.reports.financialStatementsTiles.changesInEquity.label'),
    description: t('admin.reports.financialStatementsTiles.changesInEquity.description')
  },
  {
    to: '/reports/financial-statements/balance-sheet',
    icon: 'i-heroicons-document-chart-bar',
    label: t('admin.reports.financialStatementsTiles.financialPositionReport.label'),
    description: t('admin.reports.financialStatementsTiles.financialPositionReport.description')
  }
])

const financialStatementsSearch = ref('')
const filteredFinancialStatementTiles = computed(() =>
  filterReportTiles(financialStatementTiles.value, financialStatementsSearch.value)
)

const loanAccountingReportTiles = computed<GeneralLedgerReportTile[]>(() => [
  {
    to: '/reports/loan-accounting/portfolio-summary',
    icon: 'i-heroicons-briefcase',
    label: t('admin.reports.loanAccountingReportsTiles.portfolioSummary.label'),
    description: t('admin.reports.loanAccountingReportsTiles.portfolioSummary.description')
  },
  {
    to: '/reports/loan-accounting/outstanding-balance',
    icon: 'i-heroicons-banknotes',
    label: t('admin.reports.loanAccountingReportsTiles.outstandingBalance.label'),
    description: t('admin.reports.loanAccountingReportsTiles.outstandingBalance.description')
  },
  {
    to: '/reports/loan-accounting/loans-receivable',
    icon: 'i-heroicons-banknotes',
    label: t('admin.reports.loanAccountingReportsTiles.loansReceivable.label'),
    description: t('admin.reports.loanAccountingReportsTiles.loansReceivable.description')
  },
  {
    to: '/reports/loan-accounting/interest-receivable',
    icon: 'i-heroicons-inbox-arrow-down',
    label: t('admin.reports.loanAccountingReportsTiles.interestReceivable.label'),
    description: t('admin.reports.loanAccountingReportsTiles.interestReceivable.description')
  },
  {
    to: '/reports/loan-accounting/interest-income',
    icon: 'i-heroicons-chart-bar',
    label: t('admin.reports.loanAccountingReportsTiles.interestIncome.label'),
    description: t('admin.reports.loanAccountingReportsTiles.interestIncome.description')
  },
  {
    to: '/reports/loan-accounting/penalty-income',
    icon: 'i-heroicons-exclamation-triangle',
    label: t('admin.reports.loanAccountingReportsTiles.penaltyIncome.label'),
    description: t('admin.reports.loanAccountingReportsTiles.penaltyIncome.description')
  },
  {
    to: '/reports/loan-accounting/fee-income',
    icon: 'i-heroicons-receipt-percent',
    label: t('admin.reports.loanAccountingReportsTiles.feeIncome.label'),
    description: t('admin.reports.loanAccountingReportsTiles.feeIncome.description')
  }
])

const loanAccountingReportSearch = ref('')
const filteredLoanAccountingReportTiles = computed(() =>
  filterReportTiles(loanAccountingReportTiles.value, loanAccountingReportSearch.value)
)

const receivablesReportTiles = computed<GeneralLedgerReportTile[]>(() => [
  {
    to: '/reports/receivables/aging',
    icon: 'i-heroicons-clock',
    label: t('admin.reports.receivablesReportsTiles.aging.label'),
    description: t('admin.reports.receivablesReportsTiles.aging.description')
  },
  {
    to: '/reports/receivables/outstanding',
    icon: 'i-heroicons-banknotes',
    label: t('admin.reports.receivablesReportsTiles.outstanding.label'),
    description: t('admin.reports.receivablesReportsTiles.outstanding.description')
  }
])

const receivablesReportSearch = ref('')
const filteredReceivablesReportTiles = computed(() =>
  filterReportTiles(receivablesReportTiles.value, receivablesReportSearch.value)
)

const cashReportTiles = computed<GeneralLedgerReportTile[]>(() => [
  {
    to: '/reports/cash/cash-book',
    icon: 'i-heroicons-book-open',
    label: t('admin.reports.cashReportsTiles.cashBook.label'),
    description: t('admin.reports.cashReportsTiles.cashBook.description')
  },
  {
    to: '/reports/cash/receipts',
    icon: 'i-heroicons-arrow-down-circle',
    label: t('admin.reports.cashReportsTiles.receipts.label'),
    description: t('admin.reports.cashReportsTiles.receipts.description')
  },
  {
    to: '/reports/cash/payments',
    icon: 'i-heroicons-arrow-up-circle',
    label: t('admin.reports.cashReportsTiles.payments.label'),
    description: t('admin.reports.cashReportsTiles.payments.description')
  },
  {
    to: '/reports/cash/daily-summary',
    icon: 'i-heroicons-calendar-days',
    label: t('admin.reports.cashReportsTiles.dailySummary.label'),
    description: t('admin.reports.cashReportsTiles.dailySummary.description')
  },
  {
    to: '/reports/cash/position',
    icon: 'i-heroicons-banknotes',
    label: t('admin.reports.cashReportsTiles.position.label'),
    description: t('admin.reports.cashReportsTiles.position.description')
  }
])

const cashReportSearch = ref('')
const filteredCashReportTiles = computed(() => filterReportTiles(cashReportTiles.value, cashReportSearch.value))

const branchAccountingReportTiles = computed<GeneralLedgerReportTile[]>(() => [
  {
    to: '/reports/branch-accounting/profit-and-loss',
    icon: 'i-heroicons-chart-bar',
    label: t('admin.reports.branchAccountingReportsTiles.profitAndLoss.label'),
    description: t('admin.reports.branchAccountingReportsTiles.profitAndLoss.description')
  },
  {
    to: '/reports/branch-accounting/balance-sheet',
    icon: 'i-heroicons-scale',
    label: t('admin.reports.branchAccountingReportsTiles.balanceSheet.label'),
    description: t('admin.reports.branchAccountingReportsTiles.balanceSheet.description')
  },
  {
    to: '/reports/branch-accounting/trial-balance',
    icon: 'i-heroicons-calculator',
    label: t('admin.reports.branchAccountingReportsTiles.trialBalance.label'),
    description: t('admin.reports.branchAccountingReportsTiles.trialBalance.description')
  },
  {
    to: '/reports/branch-accounting/cash-position',
    icon: 'i-heroicons-banknotes',
    label: t('admin.reports.branchAccountingReportsTiles.cashPosition.label'),
    description: t('admin.reports.branchAccountingReportsTiles.cashPosition.description')
  },
  {
    to: '/reports/branch-accounting/transaction-summary',
    icon: 'i-heroicons-document-chart-bar',
    label: t('admin.reports.branchAccountingReportsTiles.transactionSummary.label'),
    description: t('admin.reports.branchAccountingReportsTiles.transactionSummary.description')
  }
])

const branchAccountingReportSearch = ref('')
const filteredBranchAccountingReportTiles = computed(() =>
  filterReportTiles(branchAccountingReportTiles.value, branchAccountingReportSearch.value)
)

const expenseReportTiles = computed<GeneralLedgerReportTile[]>(() => [
  {
    to: '/reports/expenses/operating-expenses',
    icon: 'i-heroicons-receipt-percent',
    label: t('admin.reports.expenseReportsTiles.operatingExpenses.label'),
    description: t('admin.reports.expenseReportsTiles.operatingExpenses.description')
  },
  {
    to: '/reports/expenses/by-branch',
    icon: 'i-heroicons-building-office-2',
    label: t('admin.reports.expenseReportsTiles.byBranch.label'),
    description: t('admin.reports.expenseReportsTiles.byBranch.description')
  },
  {
    to: '/reports/expenses/by-category',
    icon: 'i-heroicons-tag',
    label: t('admin.reports.expenseReportsTiles.byCategory.label'),
    description: t('admin.reports.expenseReportsTiles.byCategory.description')
  }
])

const expenseReportSearch = ref('')
const filteredExpenseReportTiles = computed(() => filterReportTiles(expenseReportTiles.value, expenseReportSearch.value))

// Interest/Fee/Penalty Income Report point at the same pages already built under
// "Loan Accounting Reports" — surfaced again here for discoverability under "Revenue Reports"
// rather than duplicating the ledger logic.
const revenueReportTiles = computed<GeneralLedgerReportTile[]>(() => [
  {
    to: '/reports/loan-accounting/interest-income',
    icon: 'i-heroicons-chart-bar',
    label: t('admin.reports.revenueReportsTiles.interestIncome.label'),
    description: t('admin.reports.revenueReportsTiles.interestIncome.description')
  },
  {
    to: '/reports/loan-accounting/fee-income',
    icon: 'i-heroicons-receipt-percent',
    label: t('admin.reports.revenueReportsTiles.feeIncome.label'),
    description: t('admin.reports.revenueReportsTiles.feeIncome.description')
  },
  {
    to: '/reports/loan-accounting/penalty-income',
    icon: 'i-heroicons-exclamation-triangle',
    label: t('admin.reports.revenueReportsTiles.penaltyIncome.label'),
    description: t('admin.reports.revenueReportsTiles.penaltyIncome.description')
  },
  {
    to: '/reports/revenue/other-income',
    icon: 'i-heroicons-sparkles',
    label: t('admin.reports.revenueReportsTiles.otherIncome.label'),
    description: t('admin.reports.revenueReportsTiles.otherIncome.description')
  },
  {
    to: '/reports/revenue/by-branch',
    icon: 'i-heroicons-building-office-2',
    label: t('admin.reports.revenueReportsTiles.byBranch.label'),
    description: t('admin.reports.revenueReportsTiles.byBranch.description')
  }
])

const revenueReportSearch = ref('')
const filteredRevenueReportTiles = computed(() => filterReportTiles(revenueReportTiles.value, revenueReportSearch.value))

// Portfolio Summary and Pending Applications point at pages already built elsewhere
// (Loan Accounting Reports, and the existing /applications page) rather than duplicating them.
const loanPortfolioReportTiles = computed<GeneralLedgerReportTile[]>(() => [
  {
    to: '/reports/loan-accounting/portfolio-summary',
    icon: 'i-heroicons-briefcase',
    label: t('admin.reports.loanPortfolioReportsTiles.portfolioSummary.label'),
    description: t('admin.reports.loanPortfolioReportsTiles.portfolioSummary.description')
  },
  {
    to: '/reports/loan-portfolio/loans-by-status?status=ACTIVE',
    icon: 'i-heroicons-bolt',
    label: t('admin.reports.loanPortfolioReportsTiles.activeLoans.label'),
    description: t('admin.reports.loanPortfolioReportsTiles.activeLoans.description')
  },
  {
    to: '/reports/loan-portfolio/loans-by-status?status=CLOSED',
    icon: 'i-heroicons-lock-closed',
    label: t('admin.reports.loanPortfolioReportsTiles.closedLoans.label'),
    description: t('admin.reports.loanPortfolioReportsTiles.closedLoans.description')
  },
  {
    to: '/applications',
    icon: 'i-heroicons-document-text',
    label: t('admin.reports.loanPortfolioReportsTiles.pendingApplications.label'),
    description: t('admin.reports.loanPortfolioReportsTiles.pendingApplications.description')
  },
  {
    to: '/reports/loan-portfolio/loans-by-status?status=APPROVED',
    icon: 'i-heroicons-check-circle',
    label: t('admin.reports.loanPortfolioReportsTiles.approvedLoans.label'),
    description: t('admin.reports.loanPortfolioReportsTiles.approvedLoans.description')
  },
  {
    to: '/reports/loan-portfolio/loans-by-status?status=REJECTED',
    icon: 'i-heroicons-x-circle',
    label: t('admin.reports.loanPortfolioReportsTiles.rejectedLoans.label'),
    description: t('admin.reports.loanPortfolioReportsTiles.rejectedLoans.description')
  },
  {
    to: '/reports/loan-portfolio/loans-by-status',
    icon: 'i-heroicons-list-bullet',
    label: t('admin.reports.loanPortfolioReportsTiles.byStatus.label'),
    description: t('admin.reports.loanPortfolioReportsTiles.byStatus.description')
  },
  {
    to: '/reports/loan-portfolio/by-branch',
    icon: 'i-heroicons-building-office-2',
    label: t('admin.reports.loanPortfolioReportsTiles.byBranch.label'),
    description: t('admin.reports.loanPortfolioReportsTiles.byBranch.description')
  },
  {
    to: '/reports/loan-portfolio/by-customer',
    icon: 'i-heroicons-user-group',
    label: t('admin.reports.loanPortfolioReportsTiles.byCustomer.label'),
    description: t('admin.reports.loanPortfolioReportsTiles.byCustomer.description')
  }
])

const loanPortfolioReportSearch = ref('')
const filteredLoanPortfolioReportTiles = computed(() =>
  filterReportTiles(loanPortfolioReportTiles.value, loanPortfolioReportSearch.value)
)

const repaymentReportTiles = computed<GeneralLedgerReportTile[]>(() => [
  {
    to: '/reports/repayments/daily',
    icon: 'i-heroicons-calendar-days',
    label: t('admin.reports.repaymentReportsTiles.daily.label'),
    description: t('admin.reports.repaymentReportsTiles.daily.description')
  },
  {
    to: '/reports/repayments/monthly',
    icon: 'i-heroicons-calendar',
    label: t('admin.reports.repaymentReportsTiles.monthly.label'),
    description: t('admin.reports.repaymentReportsTiles.monthly.description')
  },
  {
    to: '/reports/repayments/collection',
    icon: 'i-heroicons-inbox-arrow-down',
    label: t('admin.reports.repaymentReportsTiles.collection.label'),
    description: t('admin.reports.repaymentReportsTiles.collection.description')
  },
  {
    to: '/reports/repayments/early',
    icon: 'i-heroicons-forward',
    label: t('admin.reports.repaymentReportsTiles.early.label'),
    description: t('admin.reports.repaymentReportsTiles.early.description')
  },
  {
    to: '/reports/repayments/missed',
    icon: 'i-heroicons-exclamation-triangle',
    label: t('admin.reports.repaymentReportsTiles.missed.label'),
    description: t('admin.reports.repaymentReportsTiles.missed.description')
  }
])

const repaymentReportSearch = ref('')
const filteredRepaymentReportTiles = computed(() => filterReportTiles(repaymentReportTiles.value, repaymentReportSearch.value))

// Outstanding Balance / by Customer / by Branch point at pages already built under
// Loan Accounting Reports / Loan Portfolio Reports — surfaced again here for
// discoverability under "Outstanding" rather than duplicating the logic.
const outstandingReportTiles = computed<GeneralLedgerReportTile[]>(() => [
  {
    to: '/reports/loan-accounting/loans-receivable',
    icon: 'i-heroicons-banknotes',
    label: t('admin.reports.outstandingReportsTiles.outstandingPrincipal.label'),
    description: t('admin.reports.outstandingReportsTiles.outstandingPrincipal.description')
  },
  {
    to: '/reports/loan-accounting/interest-receivable',
    icon: 'i-heroicons-inbox-arrow-down',
    label: t('admin.reports.outstandingReportsTiles.outstandingInterest.label'),
    description: t('admin.reports.outstandingReportsTiles.outstandingInterest.description')
  },
  {
    to: '/reports/loan-accounting/outstanding-balance',
    icon: 'i-heroicons-scale',
    label: t('admin.reports.outstandingReportsTiles.outstandingBalance.label'),
    description: t('admin.reports.outstandingReportsTiles.outstandingBalance.description')
  },
  {
    to: '/reports/loan-portfolio/by-customer',
    icon: 'i-heroicons-user-group',
    label: t('admin.reports.outstandingReportsTiles.byCustomer.label'),
    description: t('admin.reports.outstandingReportsTiles.byCustomer.description')
  },
  {
    to: '/reports/loan-portfolio/by-branch',
    icon: 'i-heroicons-building-office-2',
    label: t('admin.reports.outstandingReportsTiles.byBranch.label'),
    description: t('admin.reports.outstandingReportsTiles.byBranch.description')
  }
])

const outstandingReportSearch = ref('')
const filteredOutstandingReportTiles = computed(() =>
  filterReportTiles(outstandingReportTiles.value, outstandingReportSearch.value)
)

// Overdue Loans / DPD point at the Aging report (its bucket summary already covers "days
// past due"); Overdue Installments points at the Missed Repayment Report — surfaced again
// here under "Overdue & Delinquency" for discoverability rather than duplicating the logic.
const overdueReportTiles = computed<GeneralLedgerReportTile[]>(() => [
  {
    to: '/reports/receivables/aging',
    icon: 'i-heroicons-clock',
    label: t('admin.reports.overdueReportsTiles.overdueLoans.label'),
    description: t('admin.reports.overdueReportsTiles.overdueLoans.description')
  },
  {
    to: '/reports/repayments/missed',
    icon: 'i-heroicons-exclamation-triangle',
    label: t('admin.reports.overdueReportsTiles.overdueInstallments.label'),
    description: t('admin.reports.overdueReportsTiles.overdueInstallments.description')
  },
  {
    to: '/reports/receivables/aging',
    icon: 'i-heroicons-chart-bar',
    label: t('admin.reports.overdueReportsTiles.dpd.label'),
    description: t('admin.reports.overdueReportsTiles.dpd.description')
  },
  {
    to: '/reports/receivables/aging?bucket=DPD_90_PLUS',
    icon: 'i-heroicons-fire',
    label: t('admin.reports.overdueReportsTiles.delinquentLoans.label'),
    description: t('admin.reports.overdueReportsTiles.delinquentLoans.description')
  },
  {
    to: '/reports/overdue/collection-due?range=today',
    icon: 'i-heroicons-calendar-days',
    label: t('admin.reports.overdueReportsTiles.dueToday.label'),
    description: t('admin.reports.overdueReportsTiles.dueToday.description')
  },
  {
    to: '/reports/overdue/collection-due?range=week',
    icon: 'i-heroicons-calendar-days',
    label: t('admin.reports.overdueReportsTiles.dueWeek.label'),
    description: t('admin.reports.overdueReportsTiles.dueWeek.description')
  },
  {
    to: '/reports/overdue/collection-due?range=month',
    icon: 'i-heroicons-calendar',
    label: t('admin.reports.overdueReportsTiles.dueMonth.label'),
    description: t('admin.reports.overdueReportsTiles.dueMonth.description')
  }
])

const overdueReportSearch = ref('')
const filteredOverdueReportTiles = computed(() => filterReportTiles(overdueReportTiles.value, overdueReportSearch.value))

const penaltyReportTiles = computed<GeneralLedgerReportTile[]>(() => [
  {
    to: '/reports/penalties/charges',
    icon: 'i-heroicons-exclamation-triangle',
    label: t('admin.reports.penaltyReportsTiles.charges.label'),
    description: t('admin.reports.penaltyReportsTiles.charges.description')
  },
  {
    to: '/reports/penalties/waivers',
    icon: 'i-heroicons-hand-raised',
    label: t('admin.reports.penaltyReportsTiles.waivers.label'),
    description: t('admin.reports.penaltyReportsTiles.waivers.description')
  },
  {
    to: '/reports/penalties/outstanding',
    icon: 'i-heroicons-scale',
    label: t('admin.reports.penaltyReportsTiles.outstanding.label'),
    description: t('admin.reports.penaltyReportsTiles.outstanding.description')
  },
  {
    to: '/reports/penalties/collection',
    icon: 'i-heroicons-inbox-arrow-down',
    label: t('admin.reports.penaltyReportsTiles.collection.label'),
    description: t('admin.reports.penaltyReportsTiles.collection.description')
  }
])

const penaltyReportSearch = ref('')
const filteredPenaltyReportTiles = computed(() => filterReportTiles(penaltyReportTiles.value, penaltyReportSearch.value))

const interestReportTiles = computed<GeneralLedgerReportTile[]>(() => [
  {
    to: '/reports/interest/accrued',
    icon: 'i-heroicons-chart-bar',
    label: t('admin.reports.interestReportsTiles.accrued.label'),
    description: t('admin.reports.interestReportsTiles.accrued.description')
  },
  {
    to: '/reports/interest/collected',
    icon: 'i-heroicons-inbox-arrow-down',
    label: t('admin.reports.interestReportsTiles.collected.label'),
    description: t('admin.reports.interestReportsTiles.collected.description')
  },
  {
    to: '/reports/interest/outstanding',
    icon: 'i-heroicons-scale',
    label: t('admin.reports.interestReportsTiles.outstanding.label'),
    description: t('admin.reports.interestReportsTiles.outstanding.description')
  }
])

const interestReportSearch = ref('')
const filteredInterestReportTiles = computed(() =>
  filterReportTiles(interestReportTiles.value, interestReportSearch.value)
)

// Top Borrowers points at the existing Loans by Customer report (already sortable by
// principal/outstanding) rather than duplicating the aggregation logic.
const customerReportTiles = computed<GeneralLedgerReportTile[]>(() => [
  {
    to: '/reports/customers/loan-history',
    icon: 'i-heroicons-clock',
    label: t('admin.reports.customerReportsTiles.loanHistory.label'),
    description: t('admin.reports.customerReportsTiles.loanHistory.description')
  },
  {
    to: '/reports/customers/loan-history?status=ACTIVE',
    icon: 'i-heroicons-bolt',
    label: t('admin.reports.customerReportsTiles.activeLoans.label'),
    description: t('admin.reports.customerReportsTiles.activeLoans.description')
  },
  {
    to: '/reports/customers/loan-summary',
    icon: 'i-heroicons-briefcase',
    label: t('admin.reports.customerReportsTiles.loanSummary.label'),
    description: t('admin.reports.customerReportsTiles.loanSummary.description')
  },
  {
    to: '/reports/customers/payment-history',
    icon: 'i-heroicons-inbox-arrow-down',
    label: t('admin.reports.customerReportsTiles.paymentHistory.label'),
    description: t('admin.reports.customerReportsTiles.paymentHistory.description')
  },
  {
    to: '/reports/loan-portfolio/by-customer',
    icon: 'i-heroicons-trophy',
    label: t('admin.reports.customerReportsTiles.topBorrowers.label'),
    description: t('admin.reports.customerReportsTiles.topBorrowers.description')
  }
])

const customerReportSearch = ref('')
const filteredCustomerReportTiles = computed(() =>
  filterReportTiles(customerReportTiles.value, customerReportSearch.value)
)

// Due Today/Week/Month reuse the same Collection Due page already built under Overdue
// Reports (now extended with tomorrow/upcoming presets); Completed Schedules points at
// Closed Loans, since reaching CLOSED status is this system's actual "schedule done" signal.
const scheduleReportTiles = computed<GeneralLedgerReportTile[]>(() => [
  {
    to: '/reports/overdue/collection-due?range=upcoming',
    icon: 'i-heroicons-calendar-days',
    label: t('admin.reports.scheduleReportsTiles.upcoming.label'),
    description: t('admin.reports.scheduleReportsTiles.upcoming.description')
  },
  {
    to: '/reports/overdue/collection-due?range=today',
    icon: 'i-heroicons-calendar-days',
    label: t('admin.reports.scheduleReportsTiles.dueToday.label'),
    description: t('admin.reports.scheduleReportsTiles.dueToday.description')
  },
  {
    to: '/reports/overdue/collection-due?range=tomorrow',
    icon: 'i-heroicons-calendar-days',
    label: t('admin.reports.scheduleReportsTiles.dueTomorrow.label'),
    description: t('admin.reports.scheduleReportsTiles.dueTomorrow.description')
  },
  {
    to: '/reports/overdue/collection-due?range=week',
    icon: 'i-heroicons-calendar-days',
    label: t('admin.reports.scheduleReportsTiles.dueWeek.label'),
    description: t('admin.reports.scheduleReportsTiles.dueWeek.description')
  },
  {
    to: '/reports/overdue/collection-due?range=month',
    icon: 'i-heroicons-calendar',
    label: t('admin.reports.scheduleReportsTiles.dueMonth.label'),
    description: t('admin.reports.scheduleReportsTiles.dueMonth.description')
  },
  {
    to: '/reports/loan-portfolio/loans-by-status?status=CLOSED',
    icon: 'i-heroicons-check-circle',
    label: t('admin.reports.scheduleReportsTiles.completedSchedules.label'),
    description: t('admin.reports.scheduleReportsTiles.completedSchedules.description')
  }
])

const scheduleReportSearch = ref('')
const filteredScheduleReportTiles = computed(() =>
  filterReportTiles(scheduleReportTiles.value, scheduleReportSearch.value)
)

// Loan Rescheduling points at the same Loan Restructuring report — LoanRestructure
// (term/rate changes) is this system's only concept matching "rescheduling".
const writeoffRestructureReportTiles = computed<GeneralLedgerReportTile[]>(() => [
  {
    to: '/reports/writeoffs-restructures/writeoffs',
    icon: 'i-heroicons-trash',
    label: t('admin.reports.writeoffRestructureReportsTiles.writeoffs.label'),
    description: t('admin.reports.writeoffRestructureReportsTiles.writeoffs.description')
  },
  {
    to: '/reports/writeoffs-restructures/restructuring',
    icon: 'i-heroicons-arrow-path',
    label: t('admin.reports.writeoffRestructureReportsTiles.restructuring.label'),
    description: t('admin.reports.writeoffRestructureReportsTiles.restructuring.description')
  },
  {
    to: '/reports/writeoffs-restructures/refinancing',
    icon: 'i-heroicons-arrows-right-left',
    label: t('admin.reports.writeoffRestructureReportsTiles.refinancing.label'),
    description: t('admin.reports.writeoffRestructureReportsTiles.refinancing.description')
  },
  {
    to: '/reports/writeoffs-restructures/restructuring',
    icon: 'i-heroicons-calendar-days',
    label: t('admin.reports.writeoffRestructureReportsTiles.rescheduling.label'),
    description: t('admin.reports.writeoffRestructureReportsTiles.rescheduling.description')
  }
])

const writeoffRestructureReportSearch = ref('')
const filteredWriteoffRestructureReportTiles = computed(() =>
  filterReportTiles(writeoffRestructureReportTiles.value, writeoffRestructureReportSearch.value)
)

const reportColumns = computed<ColumnDef<GeneralLedgerReportTile>[]>(() => [
  { key: 'label', label: t('admin.reports.reportsTable.columns.name') },
  { key: 'description', label: t('admin.reports.reportsTable.columns.description') },
  {
    key: 'actions',
    label: '',
    type: 'link',
    value: () => t('admin.reports.reportsTable.open'),
    href: (row) => row.to
  }
])

const trendChartOptions = computed(() => {
  const gridColor = isDark.value ? '#374151' : '#e5e7eb'
  const textColor = isDark.value ? '#9ca3af' : '#6b7280'
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { position: 'top' as const, labels: { color: textColor, usePointStyle: true } },
      tooltip: {
        callbacks: {
          label: (ctx: TooltipItem<'line'>) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`
        }
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: textColor } },
      y: {
        grid: { color: gridColor },
        ticks: {
          color: textColor,
          callback: (value: string | number) => formatCurrency(Number(value))
        }
      }
    }
  }
})
</script>
