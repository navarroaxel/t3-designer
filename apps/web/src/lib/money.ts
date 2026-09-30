/** Money as a bare `$` and a number: the currency is whatever the user thinks in. */
export function moneyFormatter(locale: string) {
  const plain = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 })
  return { format: (value: number) => `${value < 0 ? '-' : ''}$${plain.format(Math.abs(value))}` }
}
