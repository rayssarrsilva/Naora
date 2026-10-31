import 'server-only';
import { Prisma } from '@/generated/prisma/client';
import { db } from '@/lib/db/client';
import { type DayHours, defaultWeek, minutesToTime, timeToMinutes, weekOrder } from './hours';
import type { ServiceData } from './schema';

/**
 * Every read and write of a business's data starts from the signed-in user and goes through their
 * membership. A service id from another business is answered exactly like a missing one, so the
 * response never reveals that someone else's data exists.
 */

export type MyBusiness = { id: string; name: string; slug: string };

export async function businessForUser(userId: string): Promise<MyBusiness | null> {
  const membership = await db().membership.findFirst({
    where: { userId, role: 'OWNER' },
    select: { business: { select: { id: true, name: true, slug: true } } },
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
): Promise<CreateBusinessResult> {
  if (await businessForUser(userId)) return { ok: false, error: 'alreadyHasBusiness' };
  try {
    const business = await db().business.create({
      data: {
        name: input.name,
        slug: input.slug,
        members: { create: { userId, role: 'OWNER' } },
        hours: { create: toRows(defaultWeek()) },
      },
      select: { id: true, name: true, slug: true },
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
  services: Omit<ServiceRow, 'active' | 'id'>[];
  hours: DayHours[];
};

/** What anyone with the link sees: active services and opening hours, nothing else. */
export async function publicBusiness(slug: string): Promise<PublicBusiness | null> {
  const business = await db().business.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true },
  });
  if (!business) return null;
  const [services, hours] = await Promise.all([
    db().service.findMany({
      where: { businessId: business.id, active: true },
      select: { name: true, durationMin: true, priceCents: true, depositCents: true },
      orderBy: { createdAt: 'asc' },
    }),
    getHours(business.id),
  ]);
  return { name: business.name, slug: business.slug, services, hours };
}
