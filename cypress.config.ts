import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL ?? 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    viewportWidth: 1280,
    viewportHeight: 800,
    video: false,
    // CI machines are slower than a laptop, and server actions hit a real database there.
    defaultCommandTimeout: 10000,
    retries: { runMode: 2, openMode: 0 },
  },
});
