import type { LoanResponse } from '~/features/loans/types'
import type { ScheduleInstallmentRequest } from '~/features/payments/types'

// Builds a standard fixed-installment amortization schedule for a loan, to
// send to POST /api/payments/schedule (payment-service's own record of
// installments — separate from loan-service's outstandingBalance ledger).
// Uses the loan's `monthlyInstallment` if the backend already computed one,
// otherwise falls back to the standard annuity formula.
export function generateAmortizationSchedule(loan: LoanResponse): ScheduleInstallmentRequest[] {
  const principal = loan.principal
  const monthlyRate = loan.interestRate / 100 / 12
  const n = loan.termMonths

  let installment = loan.monthlyInstallment
  if (!installment) {
    installment =
      monthlyRate === 0
        ? principal / n
        : (principal * monthlyRate * Math.pow(1 + monthlyRate, n)) /
          (Math.pow(1 + monthlyRate, n) - 1)
  }

  const startDate = loan.disbursedAt ? new Date(loan.disbursedAt) : new Date()
  let balance = principal
  const installments: ScheduleInstallmentRequest[] = []

  for (let i = 1; i <= n; i++) {
    const interestComponent = round2(balance * monthlyRate)
    let principalComponent = round2(installment - interestComponent)
    // Last installment absorbs any rounding drift so the schedule fully pays off the balance.
    if (i === n) principalComponent = round2(balance)

    const dueDate = new Date(startDate)
    dueDate.setMonth(dueDate.getMonth() + i)

    installments.push({
      installmentNumber: i,
      dueDate: dueDate.toISOString().slice(0, 10),
      principalComponent,
      interestComponent,
      amount: round2(principalComponent + interestComponent)
    })

    balance = round2(balance - principalComponent)
  }

  return installments
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}
