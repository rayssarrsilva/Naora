<div align="center">

# Naora

**Online booking with a Pix deposit, for salons, barbershops and studios.**

**English** · [Português](./README.pt-BR.md)

[![CI](https://github.com/rayssarrsilva/naora/actions/workflows/ci.yml/badge.svg)](https://github.com/rayssarrsilva/naora/actions/workflows/ci.yml)
[![CodeQL](https://github.com/rayssarrsilva/naora/actions/workflows/codeql.yml/badge.svg)](https://github.com/rayssarrsilva/naora/actions/workflows/codeql.yml)

</div>

> **Status: Sprint 3 done.** Clients book a free time and secure it with a Pix deposit that goes straight to the business's Mercado Pago account. Next: going live, the QA cycle and the first businesses. Built in public; follow along on [LinkedIn](https://www.linkedin.com/in/rayssa-r-14936622a/).

## Why "Naora"?

Naora is how "na hora" sounds when you say it fast in Portuguese: "on time", "right then". That is the promise: the client books right then, without waiting for a reply, and arrives on time, because the slot was held with a deposit.

## What it does today

- **Sign in** with Google, or with a **one-click demo account** (an empty account just for you, no sign-up).
- **Create the business page**: name and address (`/b/studio-da-ana`), filled in from the name as you type.
- **Services**: name, duration, price and the Pix deposit, with pause and delete.
- **Opening hours** for each day of the week.
- **Public page** with the active services and the hours, ready to share on Instagram or WhatsApp.
- **Online booking**: the client picks a service, a day and a free time, leaves a name and WhatsApp number, and gets a confirmation with an "Add to Google Calendar" link. No sign-up for clients.
- **No double booking**: the check and the insert run in one transaction under a per-business Postgres lock, so when two clients click the same time at once, exactly one gets it. Times respect opening hours, the service length, one hour of notice and the business's time zone.
- **Pix deposit**: when a service has a deposit, the client gets a Pix QR code and "copia e cola" code, and the time is held for 30 minutes. The booking is confirmed when the payment lands; unpaid, the time is released. The page updates on its own.
- **The business's own Mercado Pago account**: the owner connects it in the dashboard and the money never passes through Naora. The token is checked with Mercado Pago and stored encrypted (AES-256-GCM).
- **Trustworthy confirmations**: Mercado Pago's notification only makes Naora read the payment again with the business's token; a forged notification changes nothing. A payment that arrives after someone else took the time is recorded but never double-books it.
- **Demo accounts** get a fake Pix and a "Simulate payment" button, so anyone can try the whole flow without paying.
- **Upcoming bookings** in the dashboard, with a WhatsApp link to the client and a cancel button that gives the time back.

## Where it is going

- **Live** with the first businesses in Uberaba, a full QA cycle, and then a paid plan.
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
| Security | CSP with a per-request nonce · HSTS and security headers · AES-256-GCM for stored tokens · CodeQL · Dependabot            |

## How it is checked

Every pull request runs four jobs ([`ci.yml`](./.github/workflows/ci.yml)):

| Job         | What it proves                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Quality     | Formatting, lint with zero warnings, strict typecheck, unit and component tests with coverage                                                                                                                                                                                                                                                                                                                                        |
| Database    | Every migration applies to an empty Postgres, `schema.prisma` has no change without a migration, and the integration tests pass against it, including **tenant isolation** (one business can never read, change or delete another's data) **no double booking** (eight simultaneous requests for one time, exactly one wins) and the **Pix deposit** (holds, expiry, late payments, webhooks, with Mercado Pago's answers simulated) |
| E2E and API | The production build, on a real Postgres, passes Cypress (sign-in, onboarding, services, hours, the public page, booking a time, paying the demo Pix and cancelling; navigation, theme, keyboard, WCAG 2.2 AA with axe, 320px, security headers) and the Postman collection (health, API headers, redirects)                                                                                                                         |
| Docker      | The image builds, migrates, starts healthy, reaches the database and does not run as root                                                                                                                                                                                                                                                                                                                                            |

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
src/lib/            domain code (business, booking and time zones) and infrastructure (security, database)
src/proxy.ts        per-request CSP nonce and language routing
prisma/             schema and versioned migrations
cypress/            end-to-end and accessibility tests
tests/api/          Postman collection
docs/discovery/     product brief and hypotheses
```

## Roadmap

1. **Sprint 0** · foundation: app, database, Docker, tests, security, CI ✅
2. **Sprint 1** · a business opens its page; services and opening hours ✅
3. **Sprint 2** · clients book a free time; double booking is impossible ✅
4. **Sprint 3** · Pix deposit with Mercado Pago, confirmed by webhook ✅
5. **Beta** · first businesses in Uberaba, QA cycle, then the first paid plan

## Contact

Rayssa Roberta · [portfolio](https://www.portfoliorayssarrsilva.site) · [LinkedIn](https://www.linkedin.com/in/rayssa-r-14936622a/) · rayssarrsilva1@gmail.com. Security reports: see [SECURITY.md](./SECURITY.md).

The source is public so it can be read and reviewed. It is a commercial product, so it has no open-source license: all rights reserved.
