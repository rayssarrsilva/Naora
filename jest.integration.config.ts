import type { Config } from 'jest';
import nextJest from 'next/jest.js';

/**
 * Integration tests run against a real Postgres (DATABASE_URL), with the migrations applied.
 * CI starts one as a service; locally, `docker compose up -d db && npm run db:deploy`.
 */
const createJestConfig = nextJest({ dir: './' });

const config: Config = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.int.test.ts'],
  moduleNameMapper: {
    '^server-only$': '<rootDir>/test/server-only.js',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // One database: tests run one file at a time.
  maxWorkers: 1,
};

// Prisma 7 loads its query compiler as an ES module; let SWC compile it like our own code.
async function jestConfig() {
  const resolved = await createJestConfig(config)();
  return { ...resolved, transformIgnorePatterns: ['/node_modules/(?!(@prisma)/)'] };
}

export default jestConfig;
