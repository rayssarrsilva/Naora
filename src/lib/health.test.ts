/** @jest-environment node */
import { checkHealth } from './health';

describe('checkHealth', () => {
  it('is ok without a database configured, and says so', async () => {
    await expect(checkHealth(null)).resolves.toEqual({
      status: 'ok',
      database: 'not-configured',
    });
  });

  it('is ok when the database answers', async () => {
    await expect(checkHealth(async () => {})).resolves.toEqual({ status: 'ok', database: 'ok' });
  });

  it('is degraded, not crashed, when the database is down', async () => {
    const ping = async () => {
      throw new Error('connection refused');
    };
    await expect(checkHealth(ping)).resolves.toEqual({ status: 'degraded', database: 'down' });
  });
});
