import type { LoanResponse } from '~/features/loans/types'
import type { ScheduleInstallmentRequest } from '~/features/payments/types'

export interface AmortizationPeriod {
  installmentNumber: number
  dueDate: string
  principalComponent: number
  interestComponent: number
  amount: number
}

export interface AmortizationResult {
  installment: number
  totalInterest: number
  totalPayment: number
  schedule: AmortizationPeriod[]
}

// Builds the period-by-period breakdown for a fixed installment amount —
// the shared kernel both calculateSchedule (derives its own installment from
// principal/rate/term) and generateAmortizationSchedule (uses the backend's
// already-computed monthlyInstallment when present) loop over.
function buildPeriods(
  principal: number,
  monthlyRate: number,
  termMonths: number,
  installment: number,
  startDate: Date
): AmortizationPeriod[] {
  let balance = principal
  const schedule: AmortizationPeriod[] = []

  for (let i = 1; i <= termMonths; i++) {
    const interestComponent = round2(balance * monthlyRate)
    let principalComponent = round2(installment - interestComponent)
    // Last installment absorbs any rounding drift so the schedule fully pays off the balance.
    if (i === termMonths) principalComponent = round2(balance)

    const dueDate = new Date(startDate)
    dueDate.setMonth(dueDate.getMonth() + i)

    schedule.push({
      installmentNumber: i,
      dueDate: dueDate.toISOString().slice(0, 10),
      principalComponent,
      interestComponent,
      amount: round2(principalComponent + interestComponent)
    })

    balance = round2(balance - principalComponent)
  }

  return schedule
}

function annuityInstallment(principal: number, monthlyRate: number, termMonths: number): number {
  return monthlyRate === 0
    ? principal / termMonths
    : (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
        (Math.pow(1 + monthlyRate, termMonths) - 1)
}

// Standard fixed-installment (monthly reducing-balance annuity) amortization
// — the same formula loan-service's AmortizationCalculator.java uses for real
// loans, so any caller's numbers match what the backend would actually
// produce. Doesn't branch on InterestScheme's `interestType`/`calculationMethod`
// (FLAT vs REDUCING, day-count method) because neither this file nor the
// backend equivalent does today — both hard-code monthly reducing-balance.
export function calculateSchedule(params: {
  principal: number
  annualRatePercent: number
  termMonths: number
  startDate: Date
}): AmortizationResult {
  const { principal, annualRatePercent, termMonths, startDate } = params
  const monthlyRate = annualRatePercent / 100 / 12
  const installment = annuityInstallment(principal, monthlyRate, termMonths)
  const schedule = buildPeriods(principal, monthlyRate, termMonths, installment, startDate)

  return {
    installment: round2(installment),
    totalInterest: round2(schedule.reduce((sum, p) => sum + p.interestComponent, 0)),
    totalPayment: round2(schedule.reduce((sum, p) => sum + p.amount, 0)),
    schedule
  }
}

// Builds a standard fixed-installment amortization schedule for a loan, to
// send to POST /api/payments/schedule (payment-service's own record of
// installments — separate from loan-service's outstandingBalance ledger).
// Uses the loan's `monthlyInstallment` if the backend already computed one,
// otherwise falls back to the standard annuity formula.
export function generateAmortizationSchedule(loan: LoanResponse): ScheduleInstallmentRequest[] {
  const monthlyRate = loan.interestRate / 100 / 12
  const installment =
    loan.monthlyInstallment ?? annuityInstallment(loan.principal, monthlyRate, loan.termMonths)
  const startDate = loan.disbursedAt ? new Date(loan.disbursedAt) : new Date()

  return buildPeriods(loan.principal, monthlyRate, loan.termMonths, installment, startDate)
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}
