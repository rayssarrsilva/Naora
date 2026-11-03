# Deploying Naora

Naora runs on two free services that allow commercial use:

| Part     | Service                                    | Why                                                                           |
| -------- | ------------------------------------------ | ----------------------------------------------------------------------------- |
| App      | [Render](https://render.com), Docker, free | Builds the same image the CI tests; HTTPS and deploys on every merge to main. |
| Database | [Neon](https://neon.tech), Postgres, free  | Managed Postgres with branching and point-in-time restore.                    |
| Schema   | GitHub Actions (`migrate.yml`)             | Migrations run from a reviewed commit, never from a laptop.                   |

The free Render instance sleeps after 15 minutes without visits; the first visit after that takes about a minute. Mercado Pago retries its notifications, so a sleeping instance does not lose payments. A paid instance removes the wait.

## First deploy

1. **Neon**: create a project in the São Paulo region if offered (otherwise US East). Copy two connection strings: the **pooled** one (for the app) and the **direct** one (for migrations).
2. **GitHub**: Settings › Environments › `production` › add the secret `DATABASE_URL` with the **direct** string. Then Actions › _Migrate production database_ › Run workflow.
3. **Render**: New › Blueprint › pick this repository. Render reads `render.yaml`, generates `AUTH_SECRET` and `PAYMENTS_KEY`, and asks for `DATABASE_URL` (paste the **pooled** string). Google sign-in is optional; leave its two keys empty to offer only the demo account.
4. If Render gives the service another address than `https://naora.onrender.com`, update `NEXT_PUBLIC_SITE_URL` in Render and redeploy.
5. Check `https://<address>/api/health` answers `{"status":"ok","database":"ok"}`.

## Payments and plans

Naora earns in two ways: on the **Free** plan it keeps 15% of each Pix deposit, collected by Mercado Pago's split at the moment the client pays; **Pro** is R$ 39,90 a month with no share. Both need Naora's own Mercado Pago application:

1. **Mercado Pago Developers** (with Naora's account) › _Your integrations_ › _Create application_. Choose online payments with Checkout API (Checkout Transparente).
2. In the application, set the **Redirect URL** to `https://naora.onrender.com/api/mercadopago/callback` (the address must match exactly).
3. Under **Webhooks**, add `https://naora.onrender.com/api/webhooks/mercadopago/platform` for **subscriptions** (plans and subscriptions). Pix payments do not need this: each charge carries its own notification address.
4. In Render, fill in `MP_CLIENT_ID` and `MP_CLIENT_SECRET` (the application's credentials) and `MP_PLATFORM_ACCESS_TOKEN` (the production access token of Naora's account). Redeploy.
5. In the dashboard of a real (not demo) business, click **Connect with Mercado Pago** and authorize. Then book a service with a small deposit and pay it to confirm the split in Mercado Pago's activity.

Without these keys the app still works: businesses cannot connect Mercado Pago, so deposits are arranged in person, and Pro cannot be bought. Demo accounts simulate both.

## After that

- Every merge to main deploys the app; a merge that adds a migration also runs `migrate.yml`.
- To accept real Pix deposits, a business connects its own Mercado Pago account in the dashboard. Naora never holds the money.
- `PAYMENTS_KEY` encrypts those tokens. Never change it once businesses have connected, or their tokens can no longer be read (they would need to connect again).
