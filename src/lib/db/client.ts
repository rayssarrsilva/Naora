import 'server-only';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/** One client per server process; in development it survives hot reloads. */
export function db() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  globalForPrisma.prisma ??= new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  return globalForPrisma.prisma;
}

/**
 * Options for transactions that wait on a per-business lock: under a burst of requests for the
 * same business, each one may wait for the others, so allow more than Prisma's 2s/5s defaults.
 */
export const lockedTransaction = { maxWait: 10_000, timeout: 15_000 };
