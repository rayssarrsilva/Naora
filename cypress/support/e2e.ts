import 'cypress-axe';

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
