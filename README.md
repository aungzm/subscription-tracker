# SubTracker

SubTracker helps you track recurring subscriptions, renewal dates, payment methods, and reminders in one place. It also includes CSV import for finding likely monthly subscriptions from card statements before anything is saved.

## Screenshots

<img src="public/readme/dashboard.png" alt="SubTracker dashboard with spend cards, renewal calendar, and upcoming renewals" width="900">

<p>
  <img src="public/readme/subscriptions.png" alt="Subscriptions table with filters and CSV import button" width="430">
  <img src="public/readme/csv-import-flow.png" alt="CSV import modal with a four-step guided flow" width="430">
</p>
<p>
  <img src="public/readme/analytics.png" alt="Analytics page with monthly and yearly subscription trends" width="430">
  <img src="public/readme/notifications.png" alt="Notification provider settings" width="430">
</p>
<p>
  <img src="public/readme/payment-methods.png" alt="Payment method settings" width="430">
  <img src="public/readme/categories.png" alt="Subscription category settings" width="430">
</p>

## Features

* **Subscription tracking**
  Add subscriptions, categorize them, assign payment methods, and filter the list by billing frequency, category, or payment method.

* **CSV import**
  Upload one or more card statement CSVs, map the columns in the browser, review monthly subscription matches, and import only the confirmed subscriptions.

* **Cost overview**
  See monthly spend, yearly spend, active subscriptions, and upcoming renewals from the dashboard.

* **Analytics**
  Review monthly and yearly subscription trends by category.

* **Notifications**
  Get renewal reminders through app-wide Resend email delivery and optional user-configured webhooks.

* **Recurring reminder presets**
  Configure reminders like `1 day before`, `3 days before`, and `1 week before`, with automatic rescheduling for recurring subscriptions.

* **Framework-agnostic reminder scheduling**
  Run the same reminder dispatch pipeline on Vercel Cron or from your own Docker-hosted scheduler/worker.

* **Docker support**
  Host the application yourself using Docker.

## CSV import

The import flow is designed for privacy. CSV parsing, column mapping, and subscription detection happen in the browser. The API receives only the subscriptions the user confirms.

Current detection focuses on monthly subscriptions:

* Two matching charges are marked as possible.
* Three or more matching charges are marked as likely.
* Short transaction ranges are allowed, but the UI warns when there is not enough history for reliable monthly detection.

To test the flow locally, use `public/samples/credit-card-statement-3-months.csv`.
It uses a common card export shape with these mappings:

* Merchant name: `Description`
* Transaction date: `Transaction Date`
* Amount: `Transaction Amount`
* Card/account: `Card #`
* Currency: `CAD`

## Roadmap

* Improve merchant cleanup for card statement descriptors.
* Add yearly subscription detection after the monthly import flow is proven.
* Add import presets for common banks and card issuers.
* Let users save a mapping template without storing raw transaction history.
* Add richer duplicate detection before import.

## Getting Started

### Environment Variables

Create a `.env` file before running the app locally. You can start from `.env.example`.

Required:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/subscription_tracker"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="replace-with-a-long-random-secret"
RESEND_API_KEY="re_xxxxxxxxxxxxxxxxx"
EMAIL_FROM="Subscription Tracker <no-reply@example.com>"
CRON_SECRET="replace-with-a-long-random-secret"
```

Optional:

```env
NEXT_PUBLIC_DEMO_MODE=false
```

Notes:

* `RESEND_API_KEY` is used for all email reminder delivery.
* `EMAIL_FROM` must use a sender/domain configured in Resend.
* `CRON_SECRET` protects the reminder dispatch endpoint at `/api/cron/reminders`.
* Do not commit real credentials or production secrets to source control.

### Running Locally with Next.js

1. Clone the repository:

   ```bash
   git clone https://github.com/aungzm/subscription-tracker.git
   cd subscription-tracker
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Sync Prisma schema to your database:

   ```bash
   npx prisma db push
   npx prisma generate
   ```

4. Optionally seed demo data:

   ```bash
   pnpm db:seed
   ```

5. Start the development server:

   ```bash
   pnpm dev
   ```

6. The app will be available at `http://localhost:3000`.

### Running a Production Build

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Push the Prisma schema and generate the client:

   ```bash
   npx prisma db push
   npx prisma generate
   ```

3. Build the application:

   ```bash
   pnpm build
   ```

4. Start the production server:

   ```bash
   pnpm start
   ```

5. The app will be accessible at `http://localhost:3000` by default.

### Running with Docker

1. Copy the example env file and update it with production-safe values:

   ```bash
   cp .env.example .env
   ```

2. Review `.env` and set production-safe values for:

   * `DATABASE_URL`
   * `POSTGRES_USER`
   * `POSTGRES_PASSWORD`
   * `POSTGRES_DB`
   * `NEXTAUTH_SECRET`
   * `NEXTAUTH_URL`
   * `RESEND_API_KEY`
   * `EMAIL_FROM`
   * `CRON_SECRET`
   * `REMINDER_POLL_INTERVAL_SECONDS`

3. Start the containers:

   ```bash
   docker-compose up -d
   ```

4. Apply the Prisma schema from inside the app container:

   ```bash
   docker-compose exec subscription-tracker-app npx prisma db push
   docker-compose exec subscription-tracker-app npx prisma generate
   ```

5. Access the application at `http://localhost:3000`.

6. The Compose stack now includes a `reminder-worker` service that automatically runs:

   ```bash
   pnpm exec tsx scripts/run-reminders.ts
   ```

   It repeats on the interval defined by `REMINDER_POLL_INTERVAL_SECONDS` in `.env` and shares the same database and Resend configuration as the main app.

7. To watch the reminder worker logs:

   ```bash
   docker-compose logs -f reminder-worker
   ```

## Reminder Delivery

The reminder system now uses a shared dispatch pipeline:

* Email is sent through Resend.
* Webhooks remain optional and user-configurable.
* Preset reminders are rescheduled automatically for recurring subscriptions.
* Custom reminders are one-time by default.

Core files:

* `app/api/cron/reminders/route.ts`
* `lib/reminder-dispatch.ts`
* `lib/reminder-schedule.ts`
* `scripts/run-reminders.ts`

### Vercel

This repository includes `vercel.json` with an hourly cron entry:

* `GET /api/cron/reminders`

The route requires:

* `CRON_SECRET`

Vercel Cron should call the endpoint with:

* `Authorization: Bearer <CRON_SECRET>`

### Docker / Self-Hosted

The Docker Compose setup includes a `reminder-worker` container that runs the same dispatch logic on a loop:

```bash
pnpm exec tsx scripts/run-reminders.ts
```

Set `REMINDER_POLL_INTERVAL_SECONDS` in `.env` to control how often the worker checks for due reminders. That keeps reminder behavior consistent across Vercel and Docker deployments.

## Notification Provider Model

Notification settings are intentionally split by responsibility:

* **Email** is app-wide and delivered through Resend.
* **Webhook providers** are user-managed and optional.

Users do not configure SMTP credentials in the app anymore. If you want reminder emails to work, set:

* `RESEND_API_KEY`
* `EMAIL_FROM`

## Demo instance

Demo instance can be found [here](https://subscription-tracker-alpha.vercel.app/) \
User: alice@example.com / bob@example.com \
Password: hashedpassword1 / hashedpassword2

## License

This project is open-source and available under the [MIT License](LICENSE).
