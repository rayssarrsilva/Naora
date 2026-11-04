/**
 * Sprint 1 flow: a professional signs in, creates the business page, adds a service, sets the
 * opening hours, and the public page shows them. Needs the app running with a database.
 */
describe('Business dashboard', () => {
  it('sends signed-out visitors to the sign-in page', () => {
    cy.visit('/pt/painel');
    cy.location('pathname').should('eq', '/pt/entrar');
    cy.checkPageA11y();
  });

  it('creates the page, adds a service, sets the hours and shows them publicly', () => {
    // A new name on every attempt: a retry must not find the address taken by the attempt before.
    const name = `Studio Teste ${Date.now()}`;
    const slug = name.toLowerCase().replaceAll(' ', '-');
    cy.signInAsDemo();
    cy.contains('Você está numa conta demo').should('be.visible');
    cy.checkPageA11y();

    // Onboarding: the address follows the name.
    cy.field('Nome do negócio').type(name);
    cy.field('Endereço da página').should('have.value', slug);
    cy.contains('button', 'Criar página').click();
    cy.contains('h1', name).should('be.visible');

    // Validation runs before anything reaches the server.
    cy.contains('button', 'Adicionar serviço').click();
    cy.field('Serviço').should('have.attr', 'aria-invalid', 'true');

    cy.field('Serviço').type('Corte feminino');
    cy.field('Duração (minutos)').clear().type('45');
    cy.field('Preço (R$)').type('80');
    cy.field('Sinal (R$)').clear().type('90');
    cy.contains('button', 'Adicionar serviço').click();
    cy.contains('O sinal não pode ser maior que o preço.').should('be.visible');

    cy.field('Sinal (R$)').clear().type('20');
    cy.contains('button', 'Adicionar serviço').click();
    cy.contains('[role="status"]', 'Serviço adicionado.').should('be.visible');
    cy.contains('li', 'Corte feminino').should('contain.text', 'R$ 80,00');
    cy.checkPageA11y();

    // Close on Saturdays.
    cy.contains('label', 'Sábado').click();
    cy.contains('button', 'Salvar horários').click();
    cy.contains('[role="status"]', 'Horários salvos.').should('be.visible');

    cy.contains('a', 'Abrir página').click();
    cy.location('pathname').should('eq', `/pt/b/${slug}`);
    cy.contains('h1', name).should('be.visible');
    cy.contains('li', 'Corte feminino').should('contain.text', 'Sinal de R$ 20,00 no Pix');
    cy.contains('dt', 'Sábado').next('dd').should('have.text', 'Fechado');
    cy.contains('dt', 'Segunda').next('dd').should('have.text', '09:00 – 18:00');
    cy.checkPageA11y();
  });

  it('does not let a second account take an address already in use', () => {
    const taken = `Studio Ocupado ${Date.now()}`;
    cy.signInAsDemo();
    cy.field('Nome do negócio').type(taken);
    cy.contains('button', 'Criar página').click();
    cy.contains('h1', taken).should('be.visible');

    // Another visitor, another demo account, same address.
    cy.clearCookies();
    cy.signInAsDemo();
    cy.field('Nome do negócio').type(taken);
    cy.contains('button', 'Criar página').click();
    cy.contains('Esse endereço já está em uso. Tente outro.').should('be.visible');
  });

  it('shows the plans and switches a demo account to Pro and back, with nothing charged', () => {
    cy.signInAsDemo();
    cy.field('Nome do negócio').type(`Studio Plano ${Date.now()}`);
    cy.contains('button', 'Criar página').click();
    cy.contains('h2', 'Plano').should('be.visible');
    cy.contains('li[aria-current="true"]', 'Grátis').should('contain.text', '15% de cada sinal');
    cy.contains('Na conta demo, nada é cobrado').should('be.visible');
    cy.checkPageA11y();

    cy.contains('button', 'Simular o Pro (conta demo)').click();
    cy.contains('[role="status"]', 'Pronto: você está no Pro.').should('be.visible');
    cy.contains('li[aria-current="true"]', 'Pro').should('contain.text', 'Sem taxa');

    cy.contains('button', 'Voltar para o Grátis').click();
    cy.contains('li[aria-current="true"]', 'Grátis').should('be.visible');
  });

  it('on Free, a service without a deposit cannot be booked online, and the owner is told why', () => {
    const name = `Studio Sem Sinal ${Date.now()}`;
    cy.signInAsDemo();
    cy.field('Nome do negócio').type(name);
    cy.contains('button', 'Criar página').click();
    cy.contains('h1', name).should('be.visible');
    cy.field('Serviço').type('Corte sem sinal');
    cy.field('Preço (R$)').type('50');
    cy.contains('button', 'Adicionar serviço').click();
    cy.contains('li', 'Corte sem sinal').should(
      'contain.text',
      'no plano Grátis, todo serviço precisa de sinal',
    );
    cy.contains('a', 'Abrir página').click();
    cy.contains('li', 'Corte sem sinal').should('contain.text', 'Agendamento online em breve');
    cy.contains('li', 'Corte sem sinal').find('a').should('not.exist');
  });

  it('lets a demo visitor leave the demo from the sign-in page', () => {
    cy.signInAsDemo();
    cy.visit('/pt/entrar');
    cy.contains('Você está numa conta demo').should('be.visible');
    cy.contains('button', 'Sair da demo e entrar com outra conta').click();
    cy.location('pathname').should('eq', '/pt/entrar');
    cy.contains('button', 'Entrar com uma conta demo').should('be.visible');
  });

  it('keeps sign-in, the demo and the way out in the header on every page', () => {
    cy.visit('/pt/termos');
    cy.waitForApp();
    cy.get('nav[aria-label="Sua conta"]').within(() => {
      cy.contains('a', 'Entrar').should('have.attr', 'href', '/pt/entrar');
      cy.contains('button', 'Testar a demo').click();
    });
    cy.location('pathname', { timeout: 15000 }).should('eq', '/pt/painel');
    cy.visit('/pt/termos');
    cy.waitForApp();
    cy.get('nav[aria-label="Sua conta"]').within(() => {
      cy.contains('Conta demo').should('be.visible');
      cy.contains('a', 'Meu painel').should('have.attr', 'href', '/pt/painel');
      cy.contains('button', 'Sair da demo').click();
    });
    // Leaving the demo lands where the real sign-in is.
    cy.location('pathname').should('eq', '/pt/entrar');
    cy.contains('button', 'Entrar com uma conta demo').should('be.visible');
    cy.get('nav[aria-label="Sua conta"]').contains('a', 'Entrar');
  });

  it('answers 404 for a page that does not exist', () => {
    cy.request({ url: '/pt/b/nao-existe-mesmo', failOnStatusCode: false })
      .its('status')
      .should('eq', 404);
  });
});
