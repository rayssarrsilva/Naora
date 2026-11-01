import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Encrypts secrets kept in the database (a business's Mercado Pago token) with AES-256-GCM. The key
 * lives only in the environment (PAYMENTS_KEY, 32 random bytes in base64), so a leaked database
 * dump does not leak the tokens. GCM also detects any change to the stored value.
 */

const version = 'v1';

function key(): Buffer {
  const raw = process.env.PAYMENTS_KEY;
  const bytes = raw ? Buffer.from(raw, 'base64') : Buffer.alloc(0);
  if (bytes.length !== 32) {
    throw new Error('PAYMENTS_KEY must be 32 random bytes in base64 (openssl rand -base64 32).');
  }
  return bytes;
}

/** True when secrets can be stored: PAYMENTS_KEY is set and valid. */
export function canStoreSecrets(): boolean {
  try {
    key();
    return true;
  } catch {
    return false;
  }
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [version, iv, cipher.getAuthTag(), data]
    .map((p) => (typeof p === 'string' ? p : p.toString('base64')))
    .join(':');
}

export function decryptSecret(stored: string): string {
  const [v, iv, tag, data] = stored.split(':');
  if (v !== version || !iv || !tag || !data) throw new Error('Unknown secret format.');
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString(
    'utf8',
  );
}
