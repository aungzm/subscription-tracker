import { PrismaClient, NotificationProviderType } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Hash passwords
  const hashedPassword1 = await hash("hashedpassword1", 10);
  const hashedPassword2 = await hash("hashedpassword2", 10);

  // 1. Create Users
  const [alice, bob] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Alice",
        email: "alice@example.com",
        password: hashedpassword1,
        currency: "USD",
        image: "https://randomuser.me/api/portraits/women/1.jpg",
        emailVerified: new Date(),
      },
    }),
    prisma.user.create({
      data: {
        name: "Bob",
        email: "bob@example.com",
        password: hashedpassword2,
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
        name: "Streaming",
        color: "#FF5733",
        userId: alice.id,
      },
    }),
    prisma.category.create({
      data: {
        name: "Productivity",
        color: "#33FF57",
        userId: alice.id,
      },
    }),
    prisma.category.create({
      data: {
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
        name: "Visa",
        type: "CREDIT_CARD",
        lastFour: "1234",
        expiryDate: new Date("2026-12-31"),
        userId: alice.id,
      },
    }),
    prisma.paymentMethod.create({
      data: {
        name: "PayPal",
        type: "PAYPAL",
        userId: alice.id,
      },
    }),
    prisma.paymentMethod.create({
      data: {
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
        name: "Alice Push",
        type: NotificationProviderType.PUSH,
        webhookUrl: "https://push.alice.com/webhook",
        webhookSecret: "pushsecret",
        userId: alice.id,
      },
    }),
    prisma.notificationProvider.create({
      data: {
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

  // 6. Create Reminders and connect Notification Providers (many-to-many)
  await Promise.all([
    prisma.reminder.create({
      data: {
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

  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
