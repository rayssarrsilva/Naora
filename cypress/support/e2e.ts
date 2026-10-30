import 'cypress-axe';

/**
 * Cypress injects its own <script> into the page <head> before React hydrates. React then reports a
 * hydration mismatch (minified errors #418, #423, #425) that does not happen in a real browser:
 * https://github.com/cypress-io/cypress/issues/27204
 * Only those three errors are ignored, and each one is still written to the Cypress log.
 * Any other error from the app still fails the test.
 */
const cypressHydrationNoise = /Minified React error #(418|423|425)\b/;

Cypress.on('uncaught:exception', (error) => {
  if (cypressHydrationNoise.test(error.message)) {
    Cypress.log({ name: 'hydration', message: error.message.split(';')[0] });
    return false;
  }
  return true;
});

/** Fails the test on any WCAG 2.2 A/AA violation, listing each one in the log. */
Cypress.Commands.add('checkPageA11y', () => {
  cy.injectAxe();
  cy.checkA11y(
    undefined,
    { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } },
    (violations) => {
      violations.forEach((v) => cy.log(`${v.id}: ${v.help} (${v.nodes.length})`));
    },
  );
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      checkPageA11y(): Chainable<void>;
    }
  }
}
