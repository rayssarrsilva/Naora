/** Addresses that would clash with app routes or confuse clients. */
const reserved = new Set([
  'admin',
  'api',
  'app',
  'b',
  'entrar',
  'login',
  'naora',
  'painel',
  'suporte',
]);

export const slugPattern = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;

/** "Studio da Ana Lú" → "studio-da-ana-lu". Accents removed, only a–z, 0–9 and single hyphens. */
export function slugify(name: string) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
}

export function isValidSlug(slug: string) {
  return slugPattern.test(slug) && !slug.includes('--') && !reserved.has(slug);
}
