<div align="center">

# Naora

**Agenda online com sinal no Pix, para salões, barbearias e estúdios.**

[English](./README.md) · **Português**

[![CI](https://github.com/rayssarrsilva/naora/actions/workflows/ci.yml/badge.svg)](https://github.com/rayssarrsilva/naora/actions/workflows/ci.yml)
[![CodeQL](https://github.com/rayssarrsilva/naora/actions/workflows/codeql.yml/badge.svg)](https://github.com/rayssarrsilva/naora/actions/workflows/codeql.yml)

</div>

> **Status: Sprint 1 pronta.** A profissional entra, cria a página do negócio, cadastra serviços e define o horário de funcionamento; a página pública mostra tudo. O agendamento online é a próxima sprint. Feito em público; acompanhe pelo [LinkedIn](https://www.linkedin.com/in/rayssa-r-14936622a/).

## Por que "Naora"?

Naora é "na hora" do jeito que a gente fala. É a promessa do produto: a cliente marca na hora, sem esperar resposta, e chega na hora, porque o horário ficou garantido com um sinal.

## O que já faz

- **Entrar** com Google ou com uma **conta demo de um clique** (uma conta vazia só para você, sem cadastro).
- **Criar a página do negócio**: nome e endereço (`/b/studio-da-ana`), preenchido a partir do nome enquanto você digita.
- **Serviços**: nome, duração, preço e sinal no Pix, com pausar e excluir.
- **Horário de funcionamento** de cada dia da semana.
- **Página pública** com os serviços ativos e os horários, pronta para mandar no Instagram ou no WhatsApp.

## Para onde vai

- **Clientes** abrem o link da profissional, escolhem o serviço e um horário livre e pagam um pequeno sinal no Pix para garantir.
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
| Segurança | CSP com nonce por requisição · HSTS e cabeçalhos de segurança · CodeQL · Dependabot                                      |

## Como é verificado

Todo pull request roda quatro jobs ([`ci.yml`](./.github/workflows/ci.yml)):

| Job       | O que comprova                                                                                                                                                                                                                                                                                                |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Qualidade | Formatação, lint sem nenhum aviso, typecheck estrito, testes unitários e de componente com cobertura                                                                                                                                                                                                          |
| Banco     | Toda migração aplica num Postgres vazio, o `schema.prisma` não muda sem migração e os testes de integração passam nele, incluindo o **isolamento entre negócios** (um negócio nunca lê, altera ou apaga dados de outro)                                                                                       |
| E2E e API | O build de produção, com Postgres de verdade, passa no Cypress (login, criação da página, serviços, horários e página pública; navegação, tema, teclado, WCAG 2.2 AA com axe nos dois temas e idiomas, 320px, cabeçalhos de segurança) e na coleção do Postman (health, cabeçalhos da API, redirecionamentos) |
| Docker    | A imagem compila, migra, sobe saudável, conecta no banco e não roda como root                                                                                                                                                                                                                                 |

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
3. **Sprint 2** · a cliente agenda um horário livre; agendamento duplo é impossível
4. **Sprint 3** · sinal no Pix pelo Mercado Pago, confirmado por webhook
5. **Beta** · primeiros negócios de Uberaba, ciclo de QA e o primeiro plano pago

## Contato

Rayssa Roberta · [portfólio](https://www.portfoliorayssarrsilva.site/pt/) · [LinkedIn](https://www.linkedin.com/in/rayssa-r-14936622a/) · rayssarrsilva1@gmail.com. Falhas de segurança: veja o [SECURITY.md](./SECURITY.md).

O código é público para leitura e revisão. Como é um produto comercial, não tem licença open source: todos os direitos reservados.
