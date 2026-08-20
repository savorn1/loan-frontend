import type { TermUnit } from '~/features/loans/types/loan'

const TERM_UNIT_KEYS: Record<TermUnit, string> = {
  DAY: 'loanConfig.termTemplates.units.day',
  MONTH: 'loanConfig.termTemplates.units.month',
  YEAR: 'loanConfig.termTemplates.units.year'
}

// Shared everywhere a loan/application/restructure term (value + unit) needs
// a human label — e.g. "12 Months". Defensive against a missing unit (the
// backend may not have redeployed this field yet) rather than throwing on
// t(undefined).
export function useTermUnit() {
  const { t } = useI18n()

  function termUnitLabel(unit: TermUnit | null | undefined) {
    const key = unit ? TERM_UNIT_KEYS[unit] : undefined
    return key ? t(key) : ''
  }

  function formatTermLength(value: number | null | undefined, unit: TermUnit | null | undefined) {
    if (value === null || value === undefined) return '—'
    const label = termUnitLabel(unit)
    return label ? `${value} ${label}` : String(value)
  }

  return { termUnitLabel, formatTermLength }
}
