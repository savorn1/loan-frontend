import { describe, expect, it } from 'vitest'
import { calculateSchedule, generateAmortizationSchedule } from './amortization'
import type { LoanResponse } from '~/features/loans/types'

describe('calculateSchedule', () => {
  it('computes a standard reducing-balance annuity schedule', () => {
    const result = calculateSchedule({
      principal: 10000,
      annualRatePercent: 12,
      termMonths: 12,
      startDate: new Date('2026-01-01')
    })

    expect(result.schedule).toHaveLength(12)
    expect(result.installment).toBeCloseTo(888.49, 2)
    // Sum of all installment amounts must equal totalPayment exactly.
    const summedAmount = result.schedule.reduce((sum, p) => sum + p.amount, 0)
    expect(Math.round(summedAmount * 100) / 100).toBeCloseTo(result.totalPayment, 2)
    expect(result.totalPayment).toBeCloseTo(result.totalInterest + 10000, 2)
  })

  it('fully pays off the principal by the last installment', () => {
    const result = calculateSchedule({
      principal: 10000,
      annualRatePercent: 12,
      termMonths: 12,
      startDate: new Date('2026-01-01')
    })

    const principalPaid = result.schedule.reduce((sum, p) => sum + p.principalComponent, 0)
    expect(principalPaid).toBeCloseTo(10000, 2)
  })

  it('splits principal evenly with zero interest', () => {
    const result = calculateSchedule({
      principal: 1200,
      annualRatePercent: 0,
      termMonths: 12,
      startDate: new Date('2026-01-01')
    })

    expect(result.installment).toBeCloseTo(100, 2)
    expect(result.totalInterest).toBe(0)
    expect(result.schedule.every((p) => p.interestComponent === 0)).toBe(true)
  })

  it('advances each due date by one month from the start date', () => {
    const result = calculateSchedule({
      principal: 1000,
      annualRatePercent: 6,
      termMonths: 3,
      startDate: new Date('2026-01-15')
    })

    expect(result.schedule.map((p) => p.dueDate)).toEqual([
      '2026-02-15',
      '2026-03-15',
      '2026-04-15'
    ])
  })
})

describe('generateAmortizationSchedule', () => {
  const baseLoan: LoanResponse = {
    id: 1,
    customerId: 1,
    branchId: null,
    customerName: 'Jane Doe',
    principal: 10000,
    interestRate: 12,
    termMonths: 12,
    status: 'ACTIVE',
    purpose: null,
    approvedAt: null,
    rejectedAt: null,
    disbursedAt: '2026-01-01T00:00:00Z',
    closedAt: null,
    maturityDate: null,
    monthlyInstallment: null,
    outstandingBalance: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  }

  it('falls back to the annuity formula when monthlyInstallment is absent', () => {
    const schedule = generateAmortizationSchedule(baseLoan)
    expect(schedule).toHaveLength(12)
    expect(schedule[0].amount).toBeCloseTo(888.49, 2)
  })

  it('uses the backend-provided monthlyInstallment when present', () => {
    const schedule = generateAmortizationSchedule({ ...baseLoan, monthlyInstallment: 900 })
    // First 11 installments follow the fixed 900 figure; only rounding drift differs.
    expect(schedule[0].amount).toBeCloseTo(900, 2)
  })

  it('uses today as the start date when disbursedAt is null', () => {
    const schedule = generateAmortizationSchedule({ ...baseLoan, disbursedAt: null })
    const expectedFirstDue = new Date()
    expectedFirstDue.setMonth(expectedFirstDue.getMonth() + 1)
    expect(schedule[0].dueDate).toBe(expectedFirstDue.toISOString().slice(0, 10))
  })
})
