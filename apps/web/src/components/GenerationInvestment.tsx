import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocale } from '../i18n/useLocale'
import { annualReturn, billingInput, computeBills, installCostFor, paybackOf } from '../lib/pv/billing'
import type { YearResult } from '../lib/pv/model'
import { moneyFormatter } from '../lib/money'
import { useBilling } from '../lib/useBilling'
import { PaybackView } from './GenerationPayback'

/**
 * The investment: what the installation costs and when it pays for itself. The yearly return is what the Bill tab
 * works out (the bill saved plus the cash the company pays), so both tabs share the same settings.
 */
export function InvestmentView({ year, panelsLeftOut }: { year: YearResult; panelsLeftOut: number }) {
  const { t } = useTranslation('workspace')
  const { locale } = useLocale()
  const billing = useBilling()
  const { settings } = billing
  const money = useMemo(() => moneyFormatter(locale), [locale])
  const { totals } = useMemo(() => computeBills(billingInput(year), settings), [year, settings])
  const cost = installCostFor(settings, panelsLeftOut)
  const payback = useMemo(() => paybackOf(annualReturn(totals), cost, settings.priceChange), [totals, cost, settings.priceChange])
  return <>
    <p className="array-note">{t('building.investFromBill', { saved: money.format(totals.saved), gain: money.format(totals.gain) })}</p>
    <PaybackView payback={payback} cost={cost} settings={settings} update={billing.update} />
  </>
}
