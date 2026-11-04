import type { PlanName } from '@/lib/billing/pricing';

/**
 * When a service can be booked online. Naora earns from the Pix deposit on the Free plan, so online
 * booking always goes through it:
 * - a service with a deposit needs a business that takes deposits (Mercado Pago connected, or demo);
 * - a service without a deposit is bookable only on Pro, where Naora earns from the subscription.
 */
export type OnlineBooking = 'deposit' | 'free' | 'needsMercadoPago' | 'needsDeposit';

export function onlineBooking(input: {
  takesDeposits: boolean;
  plan: PlanName;
  depositCents: number;
}): OnlineBooking {
  if (input.depositCents > 0) return input.takesDeposits ? 'deposit' : 'needsMercadoPago';
  return input.plan === 'PRO' ? 'free' : 'needsDeposit';
}

export const isBookable = (rule: OnlineBooking) => rule === 'deposit' || rule === 'free';
