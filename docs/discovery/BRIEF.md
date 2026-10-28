# Product brief · Naora

> "Naora" is "na hora" written the way it is said: "on time", "right then". Clients book right then and arrive on time.

## Problem

Salons, barbershops, nail and tattoo studios in Brazil mostly book clients through WhatsApp and Instagram messages. It works, but it costs the professional time between clients, and a no-show leaves a chair empty with no compensation. Asking for a deposit by Pix by hand is awkward, so most don't.

## Proposal

A booking link the professional shares on Instagram or WhatsApp. The client picks a service and a free time, pays a small deposit by Pix, and the time is held for both. The professional sees the day, the team and what came in, in one place.

## Who it is for

Small businesses with 1 to 5 people who work by appointment. First market: Uberaba, MG.

## Why this product (and not another idea)

- **People already pay for this.** Booking tools for salons are an established category in Brazil and abroad: Trinks, Booksy, Calendly, and many smaller apps. The market is crowded, which proves demand; Naora has to win on being simpler and cheaper, not on being first.
- **Real-world engineering problems:** several businesses in one system (multi-tenant), roles (owner and staff), time zones, payment confirmed by webhook, two clients trying the same time at once, LGPD.
- **It is what companies build and test every day:** scheduling, payments, permissions and notifications.

## Validation

There are no interviews before the first version. Instead:

1. The landing page offers a **free beta** and collects interest by email.
2. The first version ships the smallest useful flow (link → time → Pix deposit → confirmation).
3. Beta users are interviewed while they use it; the backlog changes with what they say.

### Hypotheses to test with the beta

| #   | Hypothesis                                  | Signal that it holds                                     |
| --- | ------------------------------------------- | -------------------------------------------------------- |
| H1  | Booking by message takes 30+ minutes a day  | Beta users say so, and use the link instead              |
| H2  | A Pix deposit reduces no-shows              | Fewer no-shows reported after 4 weeks                    |
| H3  | Clients accept paying a deposit             | Most bookings are completed after the payment step       |
| H4  | Professionals would pay a small monthly fee | At least 1 beta user agrees to pay after the free period |

## Constraints

- No cost to start: free tiers only; a paid plan only when revenue covers it.
- Real payments in production (Mercado Pago, Pix); never handle card data directly.
- Portuguese and English, light and dark, WCAG 2.2 AA, from the first screen.
- Legal: terms of use, privacy policy (LGPD), 7-day withdrawal right for online purchases (CDC, art. 49).

## Out of scope for the first version

Marketing tools, loyalty programs, inventory, invoices (NF-e), mobile app.
