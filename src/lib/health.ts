export type HealthReport = {
  status: 'ok' | 'degraded';
  database: 'ok' | 'down' | 'not-configured';
};

/**
 * What the load balancer and Docker ask: is the app up, and can it reach Postgres?
 * The database check is injected so it can be tested without a database.
 */
export async function checkHealth(
  pingDatabase: (() => Promise<void>) | null,
): Promise<HealthReport> {
  if (!pingDatabase) return { status: 'ok', database: 'not-configured' };
  try {
    await pingDatabase();
    return { status: 'ok', database: 'ok' };
  } catch {
    return { status: 'degraded', database: 'down' };
  }
}
