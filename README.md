# App Subscription Tracker

A simple and effective tool to help you manage your app subscriptions. Track recurring payments, monitor your spending habits over time, and receive reminders so you never miss a renewal.

## Screenshots

<p>
  <img src="https://github.com/user-attachments/assets/8cb3cd30-c606-480f-8670-6f3a10236a0b" width="270" alt="Dashboard">
  <img src="https://github.com/user-attachments/assets/dd94633f-7cf9-4897-af7b-662638e1e204" width="270" alt="Dashboard Dark">
  <img src="https://github.com/user-attachments/assets/0496e0c7-48ca-4a2c-b04d-2c81ae150777" width="270" alt="Subscriptions">
</p>
<p>
  <img src="https://github.com/user-attachments/assets/61d026ee-ff3e-4435-b858-2f9f2941fb88" width="270" alt="Subscription Details">
  <img src="https://github.com/user-attachments/assets/f1caac76-c37a-4561-b057-0b0fb4a36ed6" width="270" alt="Categories">
  <img src="https://github.com/user-attachments/assets/83d40314-7316-4e77-86c5-a43485f31dc8" width="270" alt="Payment Methods">
</p>
<p>
  <img src="https://github.com/user-attachments/assets/0b0849ff-9d7e-4763-99d2-5705e39175ff" width="270" alt="Reminders">
  <img src="https://github.com/user-attachments/assets/92f822aa-3ecc-495e-bddc-c88e16b1de65" width="270" alt="Analytics">
  <img src="https://github.com/user-attachments/assets/1d82db72-340c-442c-a943-ad4558613952" width="270" alt="Settings">
</p>
<p>
  <img src="https://github.com/user-attachments/assets/f57a1e6e-0049-492d-a53f-39a97d4f637c" width="270" alt="Notifications">
  <img src="https://github.com/user-attachments/assets/948b804e-6d61-458e-86d0-f7ea0386e66e" width="270" alt="Login">
</p>

## Features

* **Subscription Tracking**
  Easily add and manage all your active subscriptions in one place.

* **Cost Overview**
  View your total subscription costs on a monthly and yearly basis.

* **Change Over Time**
  Monitor how your subscription spending evolves over time with historical data tracking.

* **Notification System**
  Get notified of upcoming renewals through app-wide Resend email delivery and optional user-configured webhooks.

* **Recurring Reminder Presets**
  Configure reminders like `1 day before`, `3 days before`, and `1 week before`, with automatic rescheduling for recurring subscriptions.

* **Framework-Agnostic Reminder Scheduling**
  Run the same reminder dispatch pipeline on Vercel Cron or from your own Docker-hosted scheduler/worker.

* **Docker Support**
  Host the application yourself using Docker. Refer to the `docker-compose.yml` file for setup instructions.

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

5. To test CSV import, use `public/samples/credit-card-statement-3-months.csv`.
   It uses a common credit card export shape with these mappings:

   * Merchant name: `Description`
   * Transaction date: `Transaction Date`
   * Amount: `Transaction Amount`
   * Card/account: `Card #`
   * Currency: `CAD`

6. Start the development server:

   ```bash
   pnpm dev
   ```

7. The app will be available at `http://localhost:3000`.

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
