import type { LoanResponse, TermUnit } from '~/features/loans/types'
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

// Single bullet repayment at maturity — principal + simple interest,
// Actual/365 — mirrors loan-service's AmortizationCalculator.generateBulletInstallment,
// used for DAY-unit terms instead of monthly amortization.
function buildBulletPeriod(
  principal: number,
  annualRatePercent: number,
  days: number,
  startDate: Date
): AmortizationPeriod {
  const interestComponent = round2(principal * (annualRatePercent / 100) * (days / 365))
  const dueDate = new Date(startDate)
  dueDate.setDate(dueDate.getDate() + days)

  return {
    installmentNumber: 1,
    dueDate: dueDate.toISOString().slice(0, 10),
    principalComponent: round2(principal),
    interestComponent,
    amount: round2(principal + interestComponent)
  }
}

// Standard fixed-installment (monthly reducing-balance annuity) amortization
// — the same formula loan-service's AmortizationCalculator.java uses for real
// loans, so any caller's numbers match what the backend would actually
// produce. Doesn't branch on InterestScheme's `interestType`/`calculationMethod`
// (FLAT vs REDUCING, day-count method) because neither this file nor the
// backend equivalent does today — both hard-code monthly reducing-balance.
// `termValue`/`termUnit` follow the same convention as the backend: MONTH is
// unchanged, YEAR pre-multiplies by 12 before amortizing, DAY produces a
// single bullet installment (termValue is then read as a raw day count).
export function calculateSchedule(params: {
  principal: number
  annualRatePercent: number
  termMonths: number
  termUnit?: TermUnit
  startDate: Date
}): AmortizationResult {
  const { principal, annualRatePercent, termMonths, termUnit = 'MONTH', startDate } = params

  if (termUnit === 'DAY') {
    const bullet = buildBulletPeriod(principal, annualRatePercent, termMonths, startDate)
    return {
      installment: bullet.amount,
      totalInterest: bullet.interestComponent,
      totalPayment: bullet.amount,
      schedule: [bullet]
    }
  }

  const months = termUnit === 'YEAR' ? termMonths * 12 : termMonths
  const monthlyRate = annualRatePercent / 100 / 12
  const installment = annuityInstallment(principal, monthlyRate, months)
  const schedule = buildPeriods(principal, monthlyRate, months, installment, startDate)

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
// otherwise falls back to the standard annuity formula. Branches on `termUnit`
// the same way calculateSchedule does, so a DAY/YEAR loan's manually
// (re)generated schedule matches what loan-service itself would produce.
export function generateAmortizationSchedule(loan: LoanResponse): ScheduleInstallmentRequest[] {
  const startDate = loan.disbursedAt ? new Date(loan.disbursedAt) : new Date()

  if (loan.termUnit === 'DAY') {
    return [buildBulletPeriod(loan.principal, loan.interestRate, loan.termMonths, startDate)]
  }

  const months = loan.termUnit === 'YEAR' ? loan.termMonths * 12 : loan.termMonths
  const monthlyRate = loan.interestRate / 100 / 12
  const installment =
    loan.monthlyInstallment ?? annuityInstallment(loan.principal, monthlyRate, months)

  return buildPeriods(loan.principal, monthlyRate, months, installment, startDate)
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}
