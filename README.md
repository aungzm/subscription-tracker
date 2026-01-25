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
  Get notified of upcoming renewals via email or webhooks. Stay informed and avoid unexpected charges.

* **Docker Support**
  Host the application yourself using Docker. Refer to the `docker-compose.yml` file for setup instructions.

## Getting Started

### Running with Docker

1. Clone the repository:

   ```bash
   git clone https://github.com/aungzm/subscription-tracker.git
   cd your-repo
   ```

2. Start the app with Docker:

   ```bash
   docker-compose up -d
   ```

3. Access the application via `http://localhost:PORT`

### Running with Next.js (Production Build)

1. Clone the repository:

   ```bash
   git clone https://github.com/aungzm/subscription-tracker.git
   cd subscription-tracker
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Build the application:

   ```bash
   npm run build
   ```

4. Start the production server:

   ```bash
   npm start
   ```

5. The app will be accessible at `http://localhost:3000` by default.

## Demo instance

Demo instance can be found [here](https://subscription-tracker-alpha.vercel.app/) \
User: alice@example.com / bob@example.com \
Password: hashedpassword1 / hashedpassword2

## License

This project is open-source and available under the [MIT License](LICENSE).
