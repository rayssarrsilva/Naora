/**
 * Money is stored in cents and typed in reais. "45", "45,5", "45,50", "R$ 1.234,90" are all
 * accepted, and "45.50" too, for people used to a decimal point. Anything else returns null.
 * Never floats: 0.1 + 0.2 is not 0.3.
 */
export function parseReais(input: string): number | null {
  const text = input.replace(/R\$|\s/g, '');
  const decimalPoint = /^(\d+)\.(\d{1,2})$/.exec(text);
  if (decimalPoint) return Number(decimalPoint[1]) * 100 + Number(decimalPoint[2]!.padEnd(2, '0'));
  const match = /^(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/.exec(text);
  if (!match) return null;
  const whole = Number(match[1]!.replaceAll('.', ''));
  const cents = Number((match[2] ?? '0').padEnd(2, '0'));
  return whole * 100 + cents;
}

const formatters = {
  pt: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }),
  en: new Intl.NumberFormat('en', { style: 'currency', currency: 'BRL' }),
};

/** "R$ 45,90" with a normal space (Intl uses a no-break space, which breaks copy and paste). */
export function formatReais(cents: number, locale: 'pt' | 'en' = 'pt') {
  return formatters[locale].format(cents / 100).replace(/\u00a0/g, ' ');
}

/** 1234 → "12,34", for filling an input that the person can edit. */
export function centsToInput(cents: number) {
  return (cents / 100).toFixed(2).replace('.', ',');
}
