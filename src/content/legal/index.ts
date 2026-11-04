/**
 * Privacy policy and terms of use, in plain language. Written for Brazil's LGPD (Lei 13.709/2018)
 * and the consumer code. Reviewed by the owner; not a substitute for legal advice.
 */

export type LegalDoc = {
  title: string;
  updated: string;
  sections: { heading: string; body: string[] }[];
};
type Locale = 'pt' | 'en';

const contact = 'rayssarrsilva1@gmail.com';
const updatedPt = 'Atualizado em 3 de novembro de 2026.';
const updatedEn = 'Updated on November 3, 2026.';

const privacy: Record<Locale, LegalDoc> = {
  pt: {
    title: 'Política de privacidade',
    updated: updatedPt,
    sections: [
      {
        heading: 'Quem somos',
        body: [
          `A Naora é uma agenda online com sinal no Pix, criada e mantida por Rayssa Roberta, em Uberaba (MG), que é a controladora dos dados tratados aqui. Contato para qualquer assunto de privacidade: ${contact}.`,
        ],
      },
      {
        heading: 'Que dados coletamos',
        body: [
          'De quem tem um negócio: nome e e-mail da conta Google usada para entrar, e o que você cadastra (nome e endereço da página, serviços, preços, horários). Se você conectar o Mercado Pago, guardamos o identificador da sua conta e as chaves de acesso que o Mercado Pago nos dá, criptografadas.',
          'De quem agenda: nome, WhatsApp e, quando o serviço tem sinal no Pix, e-mail. O e-mail vai só para o Mercado Pago, que exige o e-mail de quem paga; não o guardamos.',
          'Não coletamos CPF, endereço, dados de cartão nem dados de saúde. O pagamento acontece inteiramente no Mercado Pago.',
        ],
      },
      {
        heading: 'Para que usamos',
        body: [
          'Para fazer o agendamento funcionar: mostrar os horários livres, reservar o horário, gerar o Pix do sinal, confirmar o pagamento e mostrar o agendamento para o negócio, com o WhatsApp de quem agendou para contato sobre aquele horário.',
          'A base legal é a execução do serviço que você pediu (LGPD, art. 7º, V). Não vendemos dados, não usamos para publicidade e não enviamos mensagens de marketing.',
        ],
      },
      {
        heading: 'Com quem compartilhamos',
        body: [
          'Mercado Pago, para gerar e confirmar o Pix e, no plano Pro, a assinatura. Google, para o login. Render (hospedagem do site) e Neon (banco de dados), que guardam os dados em servidores nos Estados Unidos, com transferência internacional protegida por contrato.',
          'O negócio onde você agendou vê o seu nome e o seu WhatsApp. Nenhum outro negócio vê os seus dados.',
        ],
      },
      {
        heading: 'Por quanto tempo guardamos',
        body: [
          'Os dados da conta e do negócio ficam enquanto a conta existir. Os agendamentos ficam guardados para o histórico do negócio e para eventuais devoluções de sinal. Contas demo podem ser apagadas a qualquer momento.',
        ],
      },
      {
        heading: 'Cookies',
        body: [
          'Usamos só o necessário: o cookie da sessão (para você continuar conectado), o do idioma e um cookie temporário durante a conexão com o Mercado Pago. O tema claro ou escuro fica salvo no seu navegador. Não usamos cookies de anúncio nem de rastreamento.',
        ],
      },
      {
        heading: 'Segurança',
        body: [
          'O site usa HTTPS, as chaves do Mercado Pago são criptografadas (AES-256-GCM) e cada negócio só acessa os próprios dados. O código é aberto no GitHub, para quem quiser conferir.',
        ],
      },
      {
        heading: 'Seus direitos',
        body: [
          `Pela LGPD (art. 18), você pode pedir para confirmar, ver, corrigir, levar ou apagar os seus dados, e saber com quem foram compartilhados. Escreva para ${contact} e respondemos em até 15 dias. Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).`,
        ],
      },
      {
        heading: 'Mudanças',
        body: [
          'Se esta política mudar, a data no topo muda junto. Mudanças importantes serão avisadas no painel.',
        ],
      },
    ],
  },
  en: {
    title: 'Privacy policy',
    updated: updatedEn,
    sections: [
      {
        heading: 'Who we are',
        body: [
          `Naora is online booking with a Pix deposit, built and run by Rayssa Roberta in Uberaba, Brazil, who is the controller of the data described here. Privacy contact: ${contact}.`,
        ],
      },
      {
        heading: 'What we collect',
        body: [
          'From business owners: the name and email of the Google account used to sign in, and what you enter (page name and address, services, prices, hours). If you connect Mercado Pago, we keep your account id and the access keys Mercado Pago gives us, encrypted.',
          'From clients who book: name, WhatsApp number and, when the service has a Pix deposit, email. The email only goes to Mercado Pago, which requires the payer’s email; we do not keep it.',
          'We do not collect tax ids, addresses, card data or health data. Payment happens entirely on Mercado Pago.',
        ],
      },
      {
        heading: 'What we use it for',
        body: [
          'To run the booking: show free times, hold the time, create the Pix deposit, confirm the payment and show the booking to the business, with the client’s WhatsApp number to reach them about that booking.',
          'The legal basis is performing the service you asked for (LGPD, art. 7, V). We do not sell data, use it for advertising or send marketing messages.',
        ],
      },
      {
        heading: 'Who we share it with',
        body: [
          'Mercado Pago, to create and confirm the Pix and, on Pro, the subscription. Google, for sign-in. Render (site hosting) and Neon (database), which store data on servers in the United States, an international transfer protected by contract.',
          'The business you booked with sees your name and WhatsApp number. No other business sees your data.',
        ],
      },
      {
        heading: 'How long we keep it',
        body: [
          'Account and business data stay while the account exists. Bookings are kept for the business’s history and for possible deposit refunds. Demo accounts may be deleted at any time.',
        ],
      },
      {
        heading: 'Cookies',
        body: [
          'Only what is needed: the session cookie (to keep you signed in), the language cookie and a short-lived cookie while connecting Mercado Pago. The light or dark theme is saved in your browser. No advertising or tracking cookies.',
        ],
      },
      {
        heading: 'Security',
        body: [
          'The site uses HTTPS, Mercado Pago keys are encrypted (AES-256-GCM) and each business can only reach its own data. The code is open on GitHub for anyone to check.',
        ],
      },
      {
        heading: 'Your rights',
        body: [
          `Under the LGPD (art. 18) you can ask to confirm, see, correct, export or delete your data, and to know who it was shared with. Write to ${contact} and we answer within 15 days. You can also complain to Brazil’s data protection authority (ANPD).`,
        ],
      },
      {
        heading: 'Changes',
        body: [
          'If this policy changes, the date at the top changes too. Important changes are announced in the dashboard.',
        ],
      },
    ],
  },
};

const terms: Record<Locale, LegalDoc> = {
  pt: {
    title: 'Termos de uso',
    updated: updatedPt,
    sections: [
      {
        heading: 'O serviço',
        body: [
          'A Naora oferece a negócios que atendem com hora marcada uma página pública de agendamento, a cobrança de sinal no Pix pelo Mercado Pago e um painel para acompanhar os agendamentos. Ao criar uma conta ou agendar, você concorda com estes termos e com a política de privacidade.',
        ],
      },
      {
        heading: 'Planos e taxas',
        body: [
          'Plano Grátis: sem mensalidade; a Naora fica com 15% de cada sinal pago, separados automaticamente pelo Mercado Pago no momento do pagamento.',
          'Plano Pro: R$ 39,90 por mês, cobrados pelo Mercado Pago como assinatura, sem taxa sobre os sinais. Você pode cancelar quando quiser, no painel; o cancelamento vale para as próximas cobranças.',
          'O Mercado Pago cobra as próprias tarifas, descontadas por ele. Mudanças de preço serão avisadas no painel com pelo menos 30 dias de antecedência.',
        ],
      },
      {
        heading: 'Pagamentos',
        body: [
          'O dinheiro do sinal vai direto para a conta Mercado Pago do negócio; a Naora não guarda nem movimenta esse dinheiro. Devoluções de sinal são combinadas entre o negócio e a cliente e feitas pelo Mercado Pago.',
        ],
      },
      {
        heading: 'Responsabilidades do negócio',
        body: [
          'Manter serviços, preços e horários corretos; atender os agendamentos confirmados; tratar com cuidado os dados das clientes, usando-os só para falar sobre o agendamento; e definir e informar a própria regra de devolução do sinal.',
        ],
      },
      {
        heading: 'Uso proibido',
        body: [
          'Não é permitido usar a Naora para atividades ilegais, para enganar clientes ou para tentar acessar dados de outros negócios. Contas que fizerem isso podem ser suspensas.',
        ],
      },
      {
        heading: 'Disponibilidade e limites',
        body: [
          'Trabalhamos para a Naora ficar sempre no ar, mas ela pode ter instabilidades. A Naora não responde por atendimentos não realizados, combinados entre negócio e cliente, nem por falhas de serviços de terceiros, como o Mercado Pago.',
        ],
      },
      {
        heading: 'Contas demo',
        body: [
          'Contas demo servem para conhecer o produto: o Pix e o plano Pro são simulados, nada é cobrado e os dados podem ser apagados a qualquer momento.',
        ],
      },
      {
        heading: 'Lei e contato',
        body: [
          `Estes termos seguem a lei brasileira, incluindo o Código de Defesa do Consumidor. Dúvidas: ${contact}.`,
        ],
      },
    ],
  },
  en: {
    title: 'Terms of use',
    updated: updatedEn,
    sections: [
      {
        heading: 'The service',
        body: [
          'Naora gives businesses that work by appointment a public booking page, a Pix deposit charged through Mercado Pago and a dashboard to follow bookings. By creating an account or booking, you agree to these terms and to the privacy policy.',
        ],
      },
      {
        heading: 'Plans and fees',
        body: [
          'Free plan: no monthly fee; Naora keeps 15% of each paid deposit, split automatically by Mercado Pago when the client pays.',
          'Pro plan: R$ 39,90 a month, charged by Mercado Pago as a subscription, with no fee on deposits. You can cancel at any time in the dashboard; cancelling applies to the next charges.',
          'Mercado Pago charges its own fees, deducted by it. Price changes will be announced in the dashboard at least 30 days ahead.',
        ],
      },
      {
        heading: 'Payments',
        body: [
          'Deposit money goes straight to the business’s Mercado Pago account; Naora never holds or moves it. Deposit refunds are agreed between the business and the client and made through Mercado Pago.',
        ],
      },
      {
        heading: 'The business’s responsibilities',
        body: [
          'Keep services, prices and hours correct; honor confirmed bookings; handle clients’ data with care, using it only to talk about the booking; and set and state its own deposit refund rule.',
        ],
      },
      {
        heading: 'Forbidden use',
        body: [
          'Naora may not be used for illegal activities, to mislead clients or to try to reach other businesses’ data. Accounts that do so may be suspended.',
        ],
      },
      {
        heading: 'Availability and limits',
        body: [
          'We work to keep Naora always online, but it may have outages. Naora is not responsible for appointments not honored, agreed between business and client, or for failures of third-party services such as Mercado Pago.',
        ],
      },
      {
        heading: 'Demo accounts',
        body: [
          'Demo accounts are for getting to know the product: the Pix and Pro are simulated, nothing is charged, and the data may be deleted at any time.',
        ],
      },
      {
        heading: 'Law and contact',
        body: [
          `These terms follow Brazilian law, including the consumer protection code. Questions: ${contact}.`,
        ],
      },
    ],
  },
};

export const legal = { privacy, terms };
export const legalDoc = (kind: 'privacy' | 'terms', locale: string) =>
  legal[kind][locale === 'en' ? 'en' : 'pt'];
