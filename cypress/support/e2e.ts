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

/** The input whose <label> has this exact text. Ipê links them with generated ids. */
Cypress.Commands.add('field', (label: string) =>
  cy
    .contains('label', new RegExp(`^${Cypress._.escapeRegExp(label)}$`))
    .invoke('attr', 'for')
    .then((id) => cy.get(`[id="${id}"]`)),
);

/** Waits until React runs in the page; the theme toggle leaves "pending" when it does. */
Cypress.Commands.add('waitForApp', () => {
  cy.get('button[data-state]').should('not.have.attr', 'data-state', 'pending');
});

/** Signs in with a fresh one-click demo account and lands on the dashboard. */
Cypress.Commands.add('signInAsDemo', (locale = 'pt') => {
  cy.visit(`/${locale}/entrar`);
  // A click before React takes over the page can be lost when React redraws it after hydration.
  cy.waitForApp();
  cy.contains(
    'button',
    locale === 'pt' ? 'Entrar com uma conta demo' : 'Sign in with a demo account',
  ).click();
  // Sign-in writes a user to the database and redirects twice; give CI more than the default 4s.
  cy.location('pathname', { timeout: 15000 }).should('eq', `/${locale}/painel`);
  // The redirect after sign-in is a client-side navigation that can still redraw the page while
  // the test types. A full load of the dashboard leaves nothing in flight.
  cy.visit(`/${locale}/painel`);
  cy.waitForApp();
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      checkPageA11y(): Chainable<void>;
      field(label: string): Chainable<JQuery<HTMLElement>>;
      waitForApp(): Chainable<void>;
      signInAsDemo(locale?: 'pt' | 'en'): Chainable<void>;
    }
  }
}
