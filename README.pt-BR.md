<div align="center">

# Naora

**Agenda online com sinal no Pix, para salões, barbearias e estúdios.**

[English](./README.md) · **Português**

[![CI](https://github.com/rayssarrsilva/naora/actions/workflows/ci.yml/badge.svg)](https://github.com/rayssarrsilva/naora/actions/workflows/ci.yml)
[![CodeQL](https://github.com/rayssarrsilva/naora/actions/workflows/codeql.yml/badge.svg)](https://github.com/rayssarrsilva/naora/actions/workflows/codeql.yml)

</div>

> **Status: Sprint 3 pronta.** A cliente agenda um horário livre e garante com um sinal no Pix, que cai direto na conta Mercado Pago do negócio. Próximo passo: colocar no ar, ciclo de QA e os primeiros negócios. Feito em público; acompanhe pelo [LinkedIn](https://www.linkedin.com/in/rayssa-r-14936622a/).

## Por que "Naora"?

Naora é "na hora" do jeito que a gente fala. É a promessa do produto: a cliente marca na hora, sem esperar resposta, e chega na hora, porque o horário ficou garantido com um sinal.

## O que já faz

- **Entrar** com Google ou com uma **conta demo de um clique** (uma conta vazia só para você, sem cadastro).
- **Criar a página do negócio**: nome e endereço (`/b/studio-da-ana`), preenchido a partir do nome enquanto você digita.
- **Serviços**: nome, duração, preço e sinal no Pix, com pausar e excluir.
- **Horário de funcionamento** de cada dia da semana.
- **Página pública** com os serviços ativos e os horários, pronta para mandar no Instagram ou no WhatsApp.
- **Agendamento online**: a cliente escolhe o serviço, o dia e um horário livre, deixa nome e WhatsApp e recebe a confirmação com o link "Adicionar ao Google Agenda". A cliente não precisa criar conta.
- **Sem horário duplicado**: a verificação e a gravação acontecem numa transação com um lock do Postgres por negócio, então quando duas clientes clicam no mesmo horário ao mesmo tempo, só uma fica com ele. Os horários respeitam o funcionamento, a duração do serviço, uma hora de antecedência e o fuso do negócio.
- **Sinal no Pix**: quando o serviço tem sinal, a cliente recebe o QR Code e o Pix copia e cola, e o horário fica guardado por 30 minutos. O agendamento é confirmado quando o pagamento cai; sem pagamento, o horário é liberado. A página atualiza sozinha.
- **Conta Mercado Pago do próprio negócio**: a profissional conecta no painel e o dinheiro nunca passa pela Naora. O token é conferido com o Mercado Pago e guardado criptografado (AES-256-GCM).
- **Confirmação confiável**: o aviso do Mercado Pago só faz a Naora ler o pagamento de novo com o token do negócio; um aviso forjado não muda nada. Um pagamento que chega depois de outra pessoa pegar o horário fica registrado, mas nunca gera horário duplicado.
- **Conta demo** recebe um Pix de mentira e um botão "Simular pagamento", para qualquer pessoa testar o fluxo inteiro sem pagar.
- **Próximos agendamentos** no painel, com link para o WhatsApp da cliente e um botão de cancelar que libera o horário.

## Para onde vai

- **No ar** com os primeiros negócios de Uberaba, ciclo de QA completo e depois um plano pago.
- **Profissionais** veem o dia, a equipe e o que entrou num lugar só, e param de perder horário com falta sem aviso.

É um produto real, com pagamento real, feito primeiro para pequenos negócios de Uberaba. O raciocínio e as hipóteses a testar estão no [brief do produto](./docs/discovery/BRIEF.md) (em inglês).

## Stack

| Camada    | Ferramentas                                                                                                              |
| --------- | ------------------------------------------------------------------------------------------------------------------------ |
| App       | Next.js 16 (App Router, Server Components) · React 19 · TypeScript (estrito)                                             |
| UI        | [Ipê Design System](https://github.com/rayssarrsilva/Ipe) · Tailwind CSS 4 · next-intl (pt-BR, en) · tema claro e escuro |
| Dados     | PostgreSQL · Prisma 7 com migrações versionadas                                                                          |
| Infra     | Docker (multi-stage, sem root) · Docker Compose · GitHub Actions                                                         |
| Qualidade | Jest · Testing Library · Cypress · cypress-axe · Postman + Newman · ESLint · Prettier · commitlint                       |
| Segurança | CSP com nonce por requisição · HSTS e cabeçalhos de segurança · AES-256-GCM para tokens guardados · CodeQL · Dependabot  |

## Como é verificado

Todo pull request roda quatro jobs ([`ci.yml`](./.github/workflows/ci.yml)):

| Job       | O que comprova                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Qualidade | Formatação, lint sem nenhum aviso, typecheck estrito, testes unitários e de componente com cobertura                                                                                                                                                                                                                                                                                                                                            |
| Banco     | Toda migração aplica num Postgres vazio, o `schema.prisma` não muda sem migração e os testes de integração passam nele, incluindo o **isolamento entre negócios** (um negócio nunca lê, altera ou apaga dados de outro) , **nenhum horário duplicado** (oito pedidos simultâneos para o mesmo horário, só um passa) e o **sinal no Pix** (horário guardado, expiração, pagamento atrasado, webhook, com as respostas do Mercado Pago simuladas) |
| E2E e API | O build de produção, com Postgres de verdade, passa no Cypress (login, criação da página, serviços, horários, página pública, agendar, pagar o Pix da demo e cancelar; navegação, tema, teclado, WCAG 2.2 AA com axe nos dois temas e idiomas, 320px, cabeçalhos de segurança) e na coleção do Postman (health, cabeçalhos da API, redirecionamentos)                                                                                           |
| Docker    | A imagem compila, migra, sobe saudável, conecta no banco e não roda como root                                                                                                                                                                                                                                                                                                                                                                   |

## Rodar localmente

Precisa do Node.js 22 (veja `.nvmrc`) e do Docker.

```bash
npm install
cp .env.example .env    # preencha o AUTH_SECRET: npx auth secret
docker compose up -d db      # Postgres em localhost:5432
npm run db:deploy            # aplica as migrações
npm run dev                  # http://localhost:3000
```

Ou rode tudo como em produção: `docker compose up --build` (http://localhost:3000). A lista de comandos está no [README em inglês](./README.md#run-it-locally).

## Próximos passos

1. **Sprint 0** · base: app, banco, Docker, testes, segurança, CI ✅
2. **Sprint 1** · o negócio cria a sua página; serviços e horário de funcionamento ✅
3. **Sprint 2** · a cliente agenda um horário livre; agendamento duplo é impossível ✅
4. **Sprint 3** · sinal no Pix pelo Mercado Pago, confirmado por webhook ✅
5. **Beta** · primeiros negócios de Uberaba, ciclo de QA e o primeiro plano pago

## Contato

Rayssa Roberta · [portfólio](https://www.portfoliorayssarrsilva.site/pt/) · [LinkedIn](https://www.linkedin.com/in/rayssa-r-14936622a/) · rayssarrsilva1@gmail.com. Falhas de segurança: veja o [SECURITY.md](./SECURITY.md).

O código é público para leitura e revisão. Como é um produto comercial, não tem licença open source: todos os direitos reservados.
