/**
 * Naora's two plans. Free costs nothing a month and keeps a share of each Pix deposit, collected by
 * Mercado Pago's split at the moment the client pays. Pro is a monthly subscription with no share.
 */

export type PlanName = 'FREE' | 'PRO';

/** Naora's share of each deposit on the Free plan. */
export const freeFeePercent = 15;

/** Pro, per month, in cents. */
export const proPriceCents = 3990;

/** Naora's share of one deposit, in cents (rounded to the nearest cent). */
export function feeFor(depositCents: number, plan: PlanName): number {
  if (plan === 'PRO' || depositCents <= 0) return 0;
  return Math.round((depositCents * freeFeePercent) / 100);
}

/** How many paid deposits of this size in a month make Pro cheaper than Free. */
export function breakEven(depositCents: number): number | null {
  const fee = feeFor(depositCents, 'FREE');
  return fee > 0 ? Math.ceil(proPriceCents / fee) : null;
}
