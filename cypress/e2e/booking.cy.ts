/**
 * Sprint 2 flow: a client books a free time on the public page, the time disappears for everyone
 * else, the professional sees the booking in the dashboard and can cancel it.
 */
describe('Booking', () => {
  const times = 'section[aria-labelledby="time-title"] a';

  /** A fresh demo account with a business and one 60-minute service; yields the page address. */
  function openSalon() {
    const slug = `salao-${Date.now()}`;
    cy.signInAsDemo();
    cy.field('Nome do negócio').type('Salão Cypress');
    cy.field('Endereço da página').clear().type(slug);
    cy.contains('button', 'Criar página').click();
    cy.contains('h1', 'Salão Cypress').should('be.visible');
    cy.field('Serviço').type('Escova');
    cy.field('Preço (R$)').type('45');
    cy.field('Sinal (R$)').clear().type('10');
    cy.contains('button', 'Adicionar serviço').click();
    cy.contains('li', 'Escova').should('be.visible');
    return cy.wrap(slug);
  }

  it('books a free time, hides it from others, and the owner can cancel it', () => {
    openSalon().then((slug) => {
      cy.visit(`/pt/b/${slug}`);
      cy.waitForApp();
      cy.contains('a', 'Agendar').click();
      cy.contains('h2', 'Escolha o dia').should('be.visible');
      cy.get('a[aria-current="date"]').should('exist');
      cy.checkPageA11y();

      // Static aliases keep the value. A plain alias re-runs its query when read, and by then the
      // page has changed: the times list is gone and the URL is the confirmation page.
      cy.get(times).first().invoke('text').as('time', { type: 'static' });
      cy.get(times).first().click();
      cy.contains('h2', 'Seus dados').should('be.visible');
      cy.location('href').as('bookingUrl', { type: 'static' });

      // Validation before anything reaches the server.
      cy.contains('button', 'Confirmar agendamento').click();
      cy.field('WhatsApp com DDD').should('have.attr', 'aria-invalid', 'true');
      cy.checkPageA11y();

      cy.field('Seu nome').type('Bia Cypress');
      cy.field('WhatsApp com DDD').type('(11) 91234-5678');
      cy.contains('button', 'Confirmar agendamento').click();
      cy.contains('h1', 'Horário reservado!').should('be.visible');
      cy.get('@time').then((time) => cy.contains('dd', String(time)).should('be.visible'));
      cy.contains('a', 'Adicionar ao Google Agenda')
        .should('have.attr', 'href')
        .and('include', 'calendar.google.com');
      cy.checkPageA11y();

      // The same time is no longer offered.
      cy.get<string>('@bookingUrl').then((url) => cy.visit(url));
      cy.contains('Esse horário não está mais livre').should('be.visible');
      cy.get('@time').then((time) => {
        cy.get(times).each(($a) => expect($a.text()).not.to.eq(time));
      });

      // The owner sees it, with a WhatsApp link, and cancels it.
      cy.visit('/pt/painel');
      cy.waitForApp();
      cy.contains('li', 'Bia Cypress')
        .should('contain.text', 'Escova')
        .find('a[href="https://wa.me/5511912345678"]')
        .should('exist');
      cy.checkPageA11y();
      cy.contains('li', 'Bia Cypress').contains('button', 'Cancelar').click();
      cy.contains('[role="status"]', 'Agendamento cancelado.').should('be.visible');
      cy.contains('li', 'Bia Cypress').should('not.exist');

      // Cancelling gave the time back.
      cy.get<string>('@bookingUrl').then((url) => cy.visit(url));
      cy.contains('h2', 'Seus dados').should('be.visible');
    });
  });

  it('answers 404 for a service that does not exist', () => {
    cy.request({ url: '/pt/b/nao-existe/agendar/nada', failOnStatusCode: false })
      .its('status')
      .should('eq', 404);
  });
});
