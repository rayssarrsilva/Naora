import { checkHealth } from '@/lib/health';

export const dynamic = 'force-dynamic';

export async function GET() {
  const ping = process.env.DATABASE_URL
    ? async () => {
        const { db } = await import('@/lib/db/client');
        await db().$queryRaw`SELECT 1`;
      }
    : null;
  const report = await checkHealth(ping);
  return Response.json(report, {
    status: report.status === 'ok' ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  });
}
