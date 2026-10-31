<div align="center">

# Naora

**Online booking with a Pix deposit, for salons, barbershops and studios.**

**English** · [Português](./README.pt-BR.md)

[![CI](https://github.com/rayssarrsilva/naora/actions/workflows/ci.yml/badge.svg)](https://github.com/rayssarrsilva/naora/actions/workflows/ci.yml)
[![CodeQL](https://github.com/rayssarrsilva/naora/actions/workflows/codeql.yml/badge.svg)](https://github.com/rayssarrsilva/naora/actions/workflows/codeql.yml)

</div>

> **Status: Sprint 1 done.** A professional signs in, creates the business page, adds services and sets opening hours; the public page shows them. Online booking is the next sprint. Built in public; follow along on [LinkedIn](https://www.linkedin.com/in/rayssa-r-14936622a/).

## Why "Naora"?

Naora is how "na hora" sounds when you say it fast in Portuguese: "on time", "right then". That is the promise: the client books right then, without waiting for a reply, and arrives on time, because the slot was held with a deposit.

## What it does today

- **Sign in** with Google, or with a **one-click demo account** (an empty account just for you, no sign-up).
- **Create the business page**: name and address (`/b/studio-da-ana`), filled in from the name as you type.
- **Services**: name, duration, price and the Pix deposit, with pause and delete.
- **Opening hours** for each day of the week.
- **Public page** with the active services and the hours, ready to share on Instagram or WhatsApp.

## Where it is going

- **Clients** open the professional's link, pick a service and a free time, and pay a small deposit by Pix to hold it.
- **Professionals** see the day, the team and what came in, in one place, and stop losing chairs to no-shows.

It is a real product, with real payments, built for small businesses in Uberaba, Brazil, first. The reasoning and the hypotheses to test are in the [product brief](./docs/discovery/BRIEF.md).

## Stack

| Layer    | Tools                                                                                                                     |
| -------- | ------------------------------------------------------------------------------------------------------------------------- |
| App      | Next.js 16 (App Router, Server Components) · React 19 · TypeScript (strict)                                               |
| UI       | [Ipê Design System](https://github.com/rayssarrsilva/Ipe) · Tailwind CSS 4 · next-intl (pt-BR, en) · light and dark theme |
| Data     | PostgreSQL · Prisma 7 with versioned migrations                                                                           |
| Infra    | Docker (multi-stage, non-root) · Docker Compose · GitHub Actions                                                          |
| Quality  | Jest · Testing Library · Cypress · cypress-axe · Postman + Newman · ESLint · Prettier · commitlint                        |
| Security | CSP with a per-request nonce · HSTS and security headers · CodeQL · Dependabot                                            |

## How it is checked

Every pull request runs four jobs ([`ci.yml`](./.github/workflows/ci.yml)):

| Job         | What it proves                                                                                                                                                                                                                                              |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quality     | Formatting, lint with zero warnings, strict typecheck, unit and component tests with coverage                                                                                                                                                               |
| Database    | Every migration applies to an empty Postgres, `schema.prisma` has no change without a migration, and the integration tests pass against it, including **tenant isolation** (one business can never read, change or delete another's data)                   |
| E2E and API | The production build, on a real Postgres, passes Cypress (sign-in, onboarding, services, hours and the public page; navigation, theme, keyboard, WCAG 2.2 AA with axe, 320px, security headers) and the Postman collection (health, API headers, redirects) |
| Docker      | The image builds, migrates, starts healthy, reaches the database and does not run as root                                                                                                                                                                   |

## Run it locally

Requires Node.js 22 (see `.nvmrc`) and Docker.

```bash
npm install
cp .env.example .env    # fill in AUTH_SECRET: npx auth secret
docker compose up -d db      # Postgres on localhost:5432
npm run db:deploy            # apply the migrations
npm run dev                  # http://localhost:3000
```

Or run everything as in production: `docker compose up --build` (http://localhost:3000).

| Command                              | What it does                                                                |
| ------------------------------------ | --------------------------------------------------------------------------- |
| `npm test`                           | Unit and component tests (Jest + Testing Library)                           |
| `npm run test:integration`           | Repository tests against Postgres (needs `DATABASE_URL` and the migrations) |
| `npm run test:e2e`                   | End-to-end and accessibility tests (Cypress; start the app first)           |
| `npm run test:api`                   | API contract tests (Newman; `BASE_URL` defaults to http://localhost:3000)   |
| `npm run lint` · `npm run typecheck` | ESLint with zero warnings · TypeScript strict                               |
| `npm run db:migrate`                 | Create a migration after changing `prisma/schema.prisma`                    |
| `npm run db:check`                   | Fail if the schema and the migrations disagree                              |

## Project structure

```
src/app/[locale]/   pages, one tree per language
src/app/api/        route handlers (health check)
src/lib/            domain and infrastructure code (security headers, database, health)
src/proxy.ts        per-request CSP nonce and language routing
prisma/             schema and versioned migrations
cypress/            end-to-end and accessibility tests
tests/api/          Postman collection
docs/discovery/     product brief and hypotheses
```

## Roadmap

1. **Sprint 0** · foundation: app, database, Docker, tests, security, CI ✅
2. **Sprint 1** · a business opens its page; services and opening hours ✅
3. **Sprint 2** · clients book a free time; double booking is impossible
4. **Sprint 3** · Pix deposit with Mercado Pago, confirmed by webhook
5. **Beta** · first businesses in Uberaba, QA cycle, then the first paid plan

## Contact

Rayssa Roberta · [portfolio](https://www.portfoliorayssarrsilva.site) · [LinkedIn](https://www.linkedin.com/in/rayssa-r-14936622a/) · rayssarrsilva1@gmail.com. Security reports: see [SECURITY.md](./SECURITY.md).

The source is public so it can be read and reviewed. It is a commercial product, so it has no open-source license: all rights reserved.
