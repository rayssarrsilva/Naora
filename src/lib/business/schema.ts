import { z } from 'zod';
import { timeToMinutes } from './hours';
import { parseReais } from './money';
import { isValidSlug } from './slug';

/**
 * One schema per form, used in the browser (React Hook Form) and again on the server (actions).
 * Error messages are keys in messages/*.json, under "Errors".
 */

export const businessSchema = z.object({
  name: z.string().trim().min(2, 'nameShort').max(60, 'nameLong'),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .refine((slug) => isValidSlug(slug), 'slugInvalid'),
});
export type BusinessInput = z.input<typeof businessSchema>;

const reais = (message: string) =>
  z
    .string()
    .trim()
    .transform((value, ctx) => {
      const cents = parseReais(value);
      if (cents === null) {
        ctx.addIssue({ code: 'custom', message });
        return z.NEVER;
      }
      return cents;
    });

export const serviceSchema = z
  .object({
    name: z.string().trim().min(2, 'nameShort').max(60, 'nameLong'),
    durationMin: z.coerce
      .number('durationInvalid')
      .int('durationInvalid')
      .min(5, 'durationInvalid')
      .max(480, 'durationInvalid')
      .refine((minutes) => minutes % 5 === 0, 'durationStep'),
    price: reais('priceInvalid').refine((cents) => cents > 0 && cents <= 1_000_000, 'priceInvalid'),
    deposit: reais('depositInvalid'),
  })
  .refine((service) => service.deposit <= service.price, {
    message: 'depositTooHigh',
    path: ['deposit'],
  });
export type ServiceInput = z.input<typeof serviceSchema>;
export type ServiceData = z.output<typeof serviceSchema>;

const day = z
  .object({
    weekday: z.number().int().min(0).max(6),
    open: z.boolean(),
    opensAt: z.string(),
    closesAt: z.string(),
  })
  .superRefine((value, ctx) => {
    if (!value.open) return;
    const opens = timeToMinutes(value.opensAt);
    const closes = timeToMinutes(value.closesAt);
    if (opens === null) ctx.addIssue({ code: 'custom', message: 'timeInvalid', path: ['opensAt'] });
    if (closes === null)
      ctx.addIssue({ code: 'custom', message: 'timeInvalid', path: ['closesAt'] });
    if (opens !== null && closes !== null && closes <= opens) {
      ctx.addIssue({ code: 'custom', message: 'closesBeforeOpens', path: ['closesAt'] });
    }
  });

export const hoursSchema = z.object({
  days: z
    .array(day)
    .length(7)
    .refine((days) => new Set(days.map((d) => d.weekday)).size === 7, 'weekdaysRepeated'),
});
export type HoursInput = z.input<typeof hoursSchema>;
