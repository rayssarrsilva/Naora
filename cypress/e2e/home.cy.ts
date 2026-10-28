describe('Home page', () => {
  it('sends visitors to the Portuguese page by default', () => {
    cy.visit('/');
    cy.location('pathname').should('eq', '/pt');
    cy.get('html').should('have.attr', 'lang', 'pt-BR');
    cy.get('h1').should('contain.text', 'Sua agenda cheia');
  });

  it('switches to English and back', () => {
    cy.visit('/pt');
    cy.contains('a', 'English').click();
    cy.location('pathname').should('eq', '/en');
    cy.get('html').should('have.attr', 'lang', 'en');
    cy.contains('a', 'Português').click();
    cy.location('pathname').should('eq', '/pt');
  });

  it('remembers the dark theme after a reload', () => {
    cy.visit('/pt');
    cy.get('button[aria-label="Usar tema escuro"]').click();
    cy.get('html').should('have.attr', 'data-theme', 'dark');
    cy.reload();
    cy.get('html').should('have.attr', 'data-theme', 'dark');
    cy.get('button[aria-label="Usar tema claro"]').should('be.visible');
  });

  it('lets keyboard users skip straight to the content', () => {
    cy.visit('/pt');
    cy.get('a[href="#content"]').focus().should('be.visible').click();
    cy.focused().should('have.attr', 'id', 'content');
  });

  it('opens an email to join the free beta', () => {
    cy.visit('/pt');
    cy.contains('a', 'Quero testar grátis')
      .should('have.attr', 'href')
      .and('match', /^mailto:rayssarrsilva1@gmail\.com\?subject=/);
  });
});

describe('Accessibility', () => {
  for (const locale of ['pt', 'en']) {
    for (const theme of ['light', 'dark']) {
      it(`has no WCAG 2.2 AA violations on /${locale} in the ${theme} theme`, () => {
        cy.visit(`/${locale}`, {
          onBeforeLoad(win) {
            win.localStorage.setItem('naora:theme', theme);
          },
        });
        cy.get('html').should('have.attr', 'data-theme', theme);
        cy.checkPageA11y();
      });
    }
  }

  it('fits a 320px phone without horizontal scroll', () => {
    cy.viewport(320, 640);
    cy.visit('/pt');
    cy.document().then((doc) => {
      expect(doc.documentElement.scrollWidth).to.be.at.most(320);
    });
  });
});

describe('Security headers', () => {
  it('sends a nonce-based Content-Security-Policy and the HTTPS headers', () => {
    cy.request('/pt').then(({ headers }) => {
      const csp = String(headers['content-security-policy']);
      expect(csp).to.match(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
      expect(csp).to.contain("frame-ancestors 'none'");
      expect(headers['strict-transport-security']).to.contain('max-age=63072000');
      expect(headers['x-content-type-options']).to.eq('nosniff');
    });
  });

  it('gives every page load a different nonce', () => {
    cy.request('/pt').then((first) => {
      cy.request('/pt').then((second) => {
        expect(first.headers['content-security-policy']).not.to.eq(
          second.headers['content-security-policy'],
        );
      });
    });
  });
});
