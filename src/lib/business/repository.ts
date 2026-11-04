import 'server-only';
import { Prisma } from '@/generated/prisma/client';
import { db } from '@/lib/db/client';
import { type DayHours, defaultWeek, minutesToTime, timeToMinutes, weekOrder } from './hours';
import { isBookable, onlineBooking } from '@/lib/booking/rules';
import type { ServiceData } from './schema';

/**
 * Every read and write of a business's data starts from the signed-in user and goes through their
 * membership. A service id from another business is answered exactly like a missing one, so the
 * response never reveals that someone else's data exists.
 */

export type MyBusiness = { id: string; name: string; slug: string; timezone: string };

const myBusinessFields = { id: true, name: true, slug: true, timezone: true } as const;

export async function businessForUser(userId: string): Promise<MyBusiness | null> {
  const membership = await db().membership.findFirst({
    where: { userId, role: 'OWNER' },
    select: { business: { select: myBusinessFields } },
    orderBy: { createdAt: 'asc' },
  });
  return membership?.business ?? null;
}

export type CreateBusinessResult =
  { ok: true; business: MyBusiness } | { ok: false; error: 'slugTaken' | 'alreadyHasBusiness' };

/** One business per owner for now. It starts with the default opening hours. */
export async function createBusiness(
  userId: string,
  input: { name: string; slug: string },
  options: { demo?: boolean } = {},
): Promise<CreateBusinessResult> {
  if (await businessForUser(userId)) return { ok: false, error: 'alreadyHasBusiness' };
  try {
    const business = await db().business.create({
      data: {
        name: input.name,
        slug: input.slug,
        demo: options.demo ?? false,
        members: { create: { userId, role: 'OWNER' } },
        hours: { create: toRows(defaultWeek()) },
      },
      select: myBusinessFields,
    });
    return { ok: true, business };
  } catch (error) {
    // Unique constraint on Business.slug: someone already uses this address.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { ok: false, error: 'slugTaken' };
    }
    throw error;
  }
}

export type ServiceRow = {
  id: string;
  name: string;
  durationMin: number;
  priceCents: number;
  depositCents: number;
  active: boolean;
};

const serviceFields = {
  id: true,
  name: true,
  durationMin: true,
  priceCents: true,
  depositCents: true,
  active: true,
} as const;

export async function listServices(businessId: string): Promise<ServiceRow[]> {
  return db().service.findMany({
    where: { businessId },
    select: serviceFields,
    orderBy: { createdAt: 'asc' },
  });
}

export async function addService(userId: string, data: ServiceData): Promise<ServiceRow | null> {
  const business = await businessForUser(userId);
  if (!business) return null;
  return db().service.create({
    data: {
      businessId: business.id,
      name: data.name,
      durationMin: data.durationMin,
      priceCents: data.price,
      depositCents: data.deposit,
    },
    select: serviceFields,
  });
}

/** True when the service existed in the user's own business and was removed. */
export async function deleteService(userId: string, serviceId: string): Promise<boolean> {
  const business = await businessForUser(userId);
  if (!business) return false;
  const { count } = await db().service.deleteMany({
    where: { id: serviceId, businessId: business.id },
  });
  return count === 1;
}

/** True when the service belongs to the user's business and was updated. */
export async function setServiceActive(
  userId: string,
  serviceId: string,
  active: boolean,
): Promise<boolean> {
  const business = await businessForUser(userId);
  if (!business) return false;
  const { count } = await db().service.updateMany({
    where: { id: serviceId, businessId: business.id },
    data: { active },
  });
  return count === 1;
}

function toRows(days: DayHours[]) {
  return days
    .filter((day) => day.open)
    .map((day) => ({
      weekday: day.weekday,
      opensAt: timeToMinutes(day.opensAt)!,
      closesAt: timeToMinutes(day.closesAt)!,
    }));
}

/** The whole week, Monday first. Days without a row are closed. */
export async function getHours(businessId: string): Promise<DayHours[]> {
  const rows = await db().openingHours.findMany({ where: { businessId } });
  return weekOrder.map((weekday) => {
    const row = rows.find((r) => r.weekday === weekday);
    return row
      ? {
          weekday,
          open: true,
          opensAt: minutesToTime(row.opensAt),
          closesAt: minutesToTime(row.closesAt),
        }
      : { weekday, open: false, opensAt: '09:00', closesAt: '18:00' };
  });
}

/** Replaces the week in one transaction, so a failure never leaves half a week saved. */
export async function saveHours(userId: string, days: DayHours[]): Promise<boolean> {
  const business = await businessForUser(userId);
  if (!business) return false;
  await db().$transaction([
    db().openingHours.deleteMany({ where: { businessId: business.id } }),
    db().openingHours.createMany({
      data: toRows(days).map((row) => ({ ...row, businessId: business.id })),
    }),
  ]);
  return true;
}

export type PublicBusiness = {
  name: string;
  slug: string;
  /** False until the business can take bookings online (Mercado Pago connected, or Pro). */
  services: (Omit<ServiceRow, 'active'> & { bookable: boolean })[];
  hours: DayHours[];
};

/** What anyone with the link sees: active services (with the id to book them) and opening hours. */
export async function publicBusiness(slug: string): Promise<PublicBusiness | null> {
  const business = await db().business.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, demo: true, plan: true, mpConnectedAt: true },
  });
  if (!business) return null;
  const takesDeposits = business.demo || business.mpConnectedAt !== null;
  const [rows, hours] = await Promise.all([
    db().service.findMany({
      where: { businessId: business.id, active: true },
      select: { id: true, name: true, durationMin: true, priceCents: true, depositCents: true },
      orderBy: { createdAt: 'asc' },
    }),
    getHours(business.id),
  ]);
  const services = rows.map((service) => ({
    ...service,
    bookable: isBookable(
      onlineBooking({ takesDeposits, plan: business.plan, depositCents: service.depositCents }),
    ),
  }));
  return { name: business.name, slug: business.slug, services, hours };
}

export type PaymentSettings = { demo: boolean; connectedAt: Date | null; accountId: string | null };

/** Whether the owner's business takes Pix deposits. The tokens themselves never leave the server. */
export async function paymentSettings(userId: string): Promise<PaymentSettings | null> {
  const business = await businessForUser(userId);
  if (!business) return null;
  const row = await db().business.findUnique({
    where: { id: business.id },
    select: { demo: true, mpConnectedAt: true, mpUserId: true },
  });
  return row ? { demo: row.demo, connectedAt: row.mpConnectedAt, accountId: row.mpUserId } : null;
}

/** Stores the business's Mercado Pago connection. Tokens arrive already encrypted. */
export async function saveMercadoPagoConnection(
  businessId: string,
  connection: { userId: string; accessToken: string; refreshToken: string; expiresAt: Date },
): Promise<void> {
  await db().business.update({
    where: { id: businessId },
    data: {
      mpUserId: connection.userId,
      mpAccessToken: connection.accessToken,
      mpRefreshToken: connection.refreshToken,
      mpTokenExpiresAt: connection.expiresAt,
      mpConnectedAt: new Date(),
    },
  });
}

export async function removeMercadoPagoConnection(userId: string): Promise<boolean> {
  const business = await businessForUser(userId);
  if (!business) return false;
  await db().business.update({
    where: { id: business.id },
    data: {
      mpUserId: null,
      mpAccessToken: null,
      mpRefreshToken: null,
      mpTokenExpiresAt: null,
      mpConnectedAt: null,
    },
  });
  return true;
}
