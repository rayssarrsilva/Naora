import type { Config } from 'jest';
import nextJest from 'next/jest.js';

// next/jest compiles TypeScript with SWC, loads .env files and mocks CSS imports.
const createJestConfig = nextJest({ dir: './' });

const config: Config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^server-only$': '<rootDir>/test/server-only.js',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Integration tests need a database; they run with jest.integration.config.ts.
  testPathIgnorePatterns: ['/node_modules/', '/cypress/', '/.next/', '\\.int\\.test\\.ts$'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/generated/**', '!src/**/*.d.ts'],
};

// next-intl and use-intl ship ES modules only; let SWC compile them like our own code.
const esmPackages = ['next-intl', 'use-intl', 'intl-messageformat', '@formatjs', 'icu-minify'];

async function jestConfig() {
  const resolved = await createJestConfig(config)();
  return {
    ...resolved,
    transformIgnorePatterns: [
      `/node_modules/(?!(${esmPackages.join('|')})/)`,
      '^.+\\.module\\.(css|sass|scss)$',
    ],
  };
}

export default jestConfig;
