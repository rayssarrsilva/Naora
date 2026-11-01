import { z } from 'zod';

/**
 * Brazilian phone with area code, as people type it: "(11) 91234-5678", "11912345678",
 * "+55 11 91234-5678". Kept as digits only, without the country code.
 */
export function normalizePhone(value: string): string | null {
  let digits = value.replace(/\D/g, '');
  if (digits.length >= 12 && digits.startsWith('55')) digits = digits.slice(2);
  return /^[1-9]{2}9?\d{8}$/.test(digits) ? digits : null;
}

/** The client's details. The time and the service travel in the URL and are checked again. */
export const bookingSchema = z.object({
  serviceId: z.string().min(1, 'slotInvalid'),
  startsAt: z.iso.datetime('slotInvalid'),
  name: z.string().trim().min(2, 'nameShort').max(60, 'nameLong'),
  phone: z
    .string()
    .trim()
    .transform((value, ctx) => {
      const phone = normalizePhone(value);
      if (!phone) {
        ctx.addIssue({ code: 'custom', message: 'phoneInvalid' });
        return z.NEVER;
      }
      return phone;
    }),
  /** Only needed when the service has a Pix deposit: Mercado Pago asks for the payer's email. */
  email: z
    .string()
    .trim()
    .toLowerCase()
    .optional()
    .transform((value) => value || undefined)
    .pipe(z.email('emailInvalid').optional()),
});
export type BookingInput = z.input<typeof bookingSchema>;
export type BookingData = z.output<typeof bookingSchema>;

/** "11912345678" → "(11) 91234-5678". */
export function formatPhone(digits: string): string {
  const area = digits.slice(0, 2);
  const rest = digits.slice(2);
  const cut = rest.length - 4;
  return `(${area}) ${rest.slice(0, cut)}-${rest.slice(cut)}`;
}
