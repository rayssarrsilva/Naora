import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// DATABASE_URL is only needed to migrate. `prisma generate` (on install, in Docker) runs without it.
const url = process.env.DATABASE_URL;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  ...(url ? { datasource: { url } } : {}),
});
