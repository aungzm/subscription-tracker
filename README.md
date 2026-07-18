# SubTracker

SubTracker is a self-hosted subscription hub for tracking recurring costs, renewal dates, payment methods, categories, and reminder delivery. It also has a browser-only CSV import flow that helps users find likely monthly subscriptions from credit card statements before saving anything.

## Screenshots

<img src="public/readme/dashboard.png" alt="SubTracker dashboard with spend cards, renewal calendar, and upcoming renewals" width="900">

| Subscriptions | CSV import | Analytics |
| --- | --- | --- |
| <img src="public/readme/subscriptions.png" alt="Subscriptions table with filters and CSV import button" width="280"> | <img src="public/readme/csv-import-flow.png" alt="CSV import modal with a four-step guided flow" width="280"> | <img src="public/readme/analytics.png" alt="Analytics page with monthly and yearly subscription trends" width="280"> |
| Notifications | Payment methods | Categories |
| <img src="public/readme/notifications.png" alt="Notification provider settings" width="280"> | <img src="public/readme/payment-methods.png" alt="Payment method settings" width="280"> | <img src="public/readme/categories.png" alt="Subscription category settings" width="280"> |

## Demo

Try the demo at [subscription-tracker-alpha.vercel.app](https://subscription-tracker-alpha.vercel.app/).

Seeded users:

* `alice@example.com` / `hashedpassword1`
* `bob@example.com` / `hashedpassword2`

## What it does

SubTracker keeps subscription data in one place:

* Track active subscriptions with cost, billing frequency, renewal date, category, and payment method.
* Filter subscriptions by billing cycle, category, payment method, and search text.
* See monthly spend, yearly spend, active subscription count, and upcoming renewals.
* Review spending trends by category across monthly and yearly charts.
* Manage categories and payment methods from settings.
* Send renewal reminders through Resend email and optional user-managed webhooks.
* Run reminders through Vercel Cron or the included Docker worker.

## CSV import

The CSV import flow is built around privacy. The browser parses the file, maps columns, detects monthly patterns, and shows the user a review step. The API receives only the subscriptions the user confirms.

The importer currently supports monthly detection:

* Two matching charges are marked as possible.
* Three or more matching charges are marked as likely.
* Short transaction ranges are allowed, but the UI warns when there is not enough history for reliable detection.

You can test the flow with `public/samples/credit-card-statement-3-months.csv`.

Suggested mappings for the sample file:

| Field | CSV column |
| --- | --- |
| Merchant name | `Description` |
| Transaction date | `Transaction Date` |
| Amount | `Transaction Amount` |
| Card/account | `Card #` |
| Currency | `CAD` |

## Tech stack

* Next.js 15
* React 19
* Prisma
* PostgreSQL
* NextAuth
* Tailwind CSS
* shadcn/ui and Radix UI
* Jest

## Getting started

You can run SubTracker locally with Node.js and PostgreSQL, or run the published Docker image with Compose.

### Environment variables

Create `.env` from `.env.example`, then set these values:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/subscription_tracker"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="replace-with-a-long-random-secret"
RESEND_API_KEY="re_xxxxxxxxxxxxxxxxx"
EMAIL_FROM="Subscription Tracker <no-reply@example.com>"
CRON_SECRET="replace-with-a-long-random-secret"
NEXT_PUBLIC_DEMO_MODE=false
```

For Docker, keep the Postgres variables from `.env.example` too:

```env
POSTGRES_USER=subtracker
POSTGRES_PASSWORD=change-this-postgres-password
POSTGRES_DB=subscription_tracker
REMINDER_POLL_INTERVAL_SECONDS=3600
```

Do not commit real secrets.

### Run locally

```bash
git clone https://github.com/aungzm/subscription-tracker.git
cd subscription-tracker
pnpm install
npx prisma db push
npx prisma generate
pnpm db:seed
pnpm dev
```

Open `http://localhost:3000`.

### Run with Docker

```bash
cp .env.example .env
docker-compose up -d
```

Then apply the schema inside the app container:

```bash
docker-compose exec subscription-tracker npx prisma db push
docker-compose exec subscription-tracker npx prisma generate
```

Open `http://localhost:3000`.

The Compose stack also starts `reminder-worker`, which runs `pnpm exec tsx scripts/run-reminders.ts` on the interval set by `REMINDER_POLL_INTERVAL_SECONDS`.

To follow worker logs:

```bash
docker-compose logs -f reminder-worker
```

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the Next.js dev server. |
| `pnpm build` | Generate Prisma Client and build the app. |
| `pnpm start` | Start the production server. |
| `pnpm test` | Run the Jest test suite. |
| `pnpm db:seed` | Reset and seed demo data. |

## Reminder delivery

Reminder delivery uses a shared dispatch path for Vercel and Docker:

* `app/api/cron/reminders/route.ts`
* `lib/reminder-dispatch.ts`
* `lib/reminder-schedule.ts`
* `scripts/run-reminders.ts`

Vercel Cron should call `GET /api/cron/reminders` with this header:

```http
Authorization: Bearer <CRON_SECRET>
```

Email reminders use Resend through `RESEND_API_KEY` and `EMAIL_FROM`. Webhook providers are optional and user-managed from settings.

## Roadmap

* Improve merchant cleanup for card statement descriptors.
* Add yearly subscription detection after the monthly import flow is proven.
* Add import presets for common banks and card issuers.
* Let users save a mapping template without storing raw transaction history.
* Add richer duplicate detection before import.

## License

This project is open source under the [MIT License](LICENSE).
