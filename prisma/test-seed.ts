// prisma/test-seed.ts

import { PrismaClient, NotificationProviderType } from "@prisma/client";
import { hash } from "bcryptjs";
import * as IDS from "./test-ids";

const prisma = new PrismaClient();

async function main() {
  // Hash passwords
  const hashedPassword1 = await hash("hashedpassword1", 10);
  const hashedPassword2 = await hash("hashedpassword2", 10);

  // 1. Create Users with predictable IDs
  const [alice, bob] = await Promise.all([
    prisma.user.create({
      data: {
        id: IDS.USER_IDS.ALICE, // <-- Add predictable ID
        name: "Alice",
        email: "alice@example.com",
        password: hashedPassword1,
        currency: "USD",
        image: "https://randomuser.me/api/portraits/women/1.jpg",
        emailVerified: new Date(),
      },
    }),
    prisma.user.create({
      data: {
        id: IDS.USER_IDS.BOB, // <-- Add predictable ID
        name: "Bob",
        email: "bob@example.com",
        password: hashedPassword2,
        currency: "EUR",
        image: "https://randomuser.me/api/portraits/men/2.jpg",
        emailVerified: new Date(),
      },
    }),
  ]);

  // 2. Create Categories
  const [streaming, productivity, utilities] = await Promise.all([
    prisma.category.create({
      data: {
        id: IDS.CATEGORY_IDS.STREAMING, // <-- Add predictable ID
        name: "Streaming",
        color: "#FF5733",
        userId: alice.id,
      },
    }),
    prisma.category.create({
      data: {
        id: IDS.CATEGORY_IDS.PRODUCTIVITY, // <-- Add predictable ID
        name: "Productivity",
        color: "#33FF57",
        userId: alice.id,
      },
    }),
    prisma.category.create({
      data: {
        id: IDS.CATEGORY_IDS.UTILITIES, // <-- Add predictable ID
        name: "Utilities",
        color: "#3357FF",
        userId: bob.id,
      },
    }),
  ]);

  // 3. Create Payment Methods
  const [visa, paypal, mastercard] = await Promise.all([
    prisma.paymentMethod.create({
      data: {
        id: IDS.PAYMENT_METHOD_IDS.VISA, // <-- Add predictable ID
        name: "Visa",
        type: "CREDIT_CARD",
        lastFour: "1234",
        expiryDate: new Date("2026-12-31"),
        userId: alice.id,
      },
    }),
    prisma.paymentMethod.create({
      data: {
        id: IDS.PAYMENT_METHOD_IDS.PAYPAL, // <-- Add predictable ID
        name: "PayPal",
        type: "PAYPAL",
        userId: alice.id,
      },
    }),
    prisma.paymentMethod.create({
      data: {
        id: IDS.PAYMENT_METHOD_IDS.MASTERCARD, // <-- Add predictable ID
        name: "Mastercard",
        type: "CREDIT_CARD",
        lastFour: "5678",
        expiryDate: new Date("2025-08-31"),
        userId: bob.id,
      },
    }),
  ]);

  // 4. Create Subscriptions
  const [netflix, notion, spotify] = await Promise.all([
    prisma.subscription.create({
      data: {
        id: IDS.SUBSCRIPTION_IDS.NETFLIX, // <-- Add predictable ID
        name: "Netflix",
        cost: 15.99,
        currency: "USD",
        billingFrequency: "monthly",
        startDate: new Date("2023-01-01"),
        endDate: null,
        notes: "Family plan",
        isShared: true,
        userId: alice.id,
        categoryId: streaming.id,
        paymentMethodId: visa.id,
      },
    }),
    prisma.subscription.create({
      data: {
        id: IDS.SUBSCRIPTION_IDS.NOTION, // <-- Add predictable ID
        name: "Notion",
        cost: 4.0,
        currency: "USD",
        billingFrequency: "monthly",
        startDate: new Date("2024-01-01"),
        endDate: null,
        notes: "Personal plan",
        isShared: false,
        userId: alice.id,
        categoryId: productivity.id,
        paymentMethodId: paypal.id,
      },
    }),
    prisma.subscription.create({
      data: {
        id: IDS.SUBSCRIPTION_IDS.SPOTIFY, // <-- Add predictable ID
        name: "Spotify",
        cost: 9.99,
        currency: "EUR",
        billingFrequency: "monthly",
        startDate: new Date("2022-05-01"),
        endDate: null,
        notes: "Student discount",
        isShared: false,
        userId: bob.id,
        categoryId: utilities.id,
        paymentMethodId: mastercard.id,
      },
    }),
  ]);

  // 5. Create Notification Providers
  const [aliceEmail, alicePush, bobEmail] = await Promise.all([
    prisma.notificationProvider.create({
      data: {
        id: IDS.NOTIFICATION_PROVIDER_IDS.ALICE_EMAIL, // <-- Add predictable ID
        name: "Alice Email",
        type: NotificationProviderType.EMAIL,
        smtpServer: "smtp.alice.com",
        smtpPort: 587,
        smtpUser: "alice@example.com",
        smtpPassword: "supersecret",
        userId: alice.id,
      },
    }),
    prisma.notificationProvider.create({
      data: {
        id: IDS.NOTIFICATION_PROVIDER_IDS.ALICE_PUSH, // <-- Add predictable ID
        name: "Alice Push",
        type: NotificationProviderType.PUSH,
        webhookUrl: "https://push.alice.com/webhook",
        webhookSecret: "pushsecret",
        userId: alice.id,
      },
    }),
    prisma.notificationProvider.create({
      data: {
        id: IDS.NOTIFICATION_PROVIDER_IDS.BOB_EMAIL, // <-- Add predictable ID
        name: "Bob Email",
        type: NotificationProviderType.EMAIL,
        smtpServer: "smtp.bob.com",
        smtpPort: 465,
        smtpUser: "bob@example.com",
        smtpPassword: "bobsecret",
        userId: bob.id,
      },
    }),
  ]);

  // 6. Create Reminders
  await Promise.all([
    prisma.reminder.create({
      data: {
        id: IDS.REMINDER_IDS.NETFLIX, // <-- Add predictable ID
        subscriptionId: netflix.id,
        userId: alice.id,
        reminderDate: new Date("2025-05-30"),
        isRead: false,
        notificationProviders: {
          connect: [{ id: aliceEmail.id }],
        },
      },
    }),
    prisma.reminder.create({
      data: {
        id: IDS.REMINDER_IDS.NOTION, // <-- Add predictable ID
        subscriptionId: notion.id,
        userId: alice.id,
        reminderDate: new Date("2025-06-03"),
        isRead: true,
        notificationProviders: {
          connect: [{ id: alicePush.id }],
        },
      },
    }),
    prisma.reminder.create({
      data: {
        id: IDS.REMINDER_IDS.SPOTIFY, // <-- Add predictable ID
        subscriptionId: spotify.id,
        userId: bob.id,
        reminderDate: new Date("2025-06-08"),
        isRead: false,
        notificationProviders: {
          connect: [{ id: bobEmail.id }],
        },
      },
    }),
  ]);

  console.log("Test seeding completed successfully with predictable IDs!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });