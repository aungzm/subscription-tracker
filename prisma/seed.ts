import {
  NotificationProviderType,
  PaymentMethodType,
  PrismaClient,
  ReminderPreset,
} from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

function withTime(date: Date, hours = 9, minutes = 0) {
  const next = new Date(date);
  next.setHours(hours, minutes, 0, 0);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function addYears(date: Date, years: number) {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + years);
  return next;
}

function monthsAgo(months: number, dayOfMonth?: number) {
  const next = addMonths(new Date(), -months);
  if (dayOfMonth) {
    next.setDate(dayOfMonth);
  }
  return withTime(next);
}

function yearsAgoFrom(date: Date, years: number) {
  return withTime(addYears(date, -years));
}

function nextMonthlyRenewal(daysFromNow: number) {
  return withTime(addDays(new Date(), daysFromNow));
}

function nextYearlyRenewal(daysFromNow: number) {
  return withTime(addDays(new Date(), daysFromNow));
}

async function resetDatabase() {
  await prisma.$transaction([
    prisma.reminder.deleteMany(),
    prisma.subscription.deleteMany(),
    prisma.notificationProvider.deleteMany(),
    prisma.paymentMethod.deleteMany(),
    prisma.category.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

async function main() {
  await resetDatabase();

  const alicePassword = await hash("hashedpassword1", 10);
  const bobPassword = await hash("hashedpassword2", 10);

  const [alice, bob] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Alice",
        email: "alice@example.com",
        password: alicePassword,
        currency: "USD",
        image: "https://randomuser.me/api/portraits/women/1.jpg",
        emailVerified: withTime(new Date(), 8, 30),
      },
    }),
    prisma.user.create({
      data: {
        name: "Bob",
        email: "bob@example.com",
        password: bobPassword,
        currency: "EUR",
        image: "https://randomuser.me/api/portraits/men/2.jpg",
        emailVerified: withTime(new Date(), 8, 45),
      },
    }),
  ]);

  const aliceCategories = await Promise.all([
    prisma.category.create({
      data: { name: "Streaming", color: "#FF6B6B", userId: alice.id },
    }),
    prisma.category.create({
      data: { name: "Productivity", color: "#4ECDC4", userId: alice.id },
    }),
    prisma.category.create({
      data: { name: "Fitness", color: "#F4A261", userId: alice.id },
    }),
    prisma.category.create({
      data: { name: "Gaming", color: "#9B5DE5", userId: alice.id },
    }),
    prisma.category.create({
      data: { name: "News", color: "#2A9D8F", userId: alice.id },
    }),
  ]);

  const bobCategories = await Promise.all([
    prisma.category.create({
      data: { name: "Utilities", color: "#3357FF", userId: bob.id },
    }),
    prisma.category.create({
      data: { name: "Travel", color: "#00A896", userId: bob.id },
    }),
    prisma.category.create({
      data: { name: "Work", color: "#FF9F1C", userId: bob.id },
    }),
    prisma.category.create({
      data: { name: "Entertainment", color: "#8338EC", userId: bob.id },
    }),
  ]);

  const [
    aliceStreaming,
    aliceProductivity,
    aliceFitness,
    aliceGaming,
    aliceNews,
  ] = aliceCategories;
  const [bobUtilities, bobTravel, bobWork, bobEntertainment] = bobCategories;

  const [
    aliceVisa,
    alicePayPal,
    aliceApplePay,
    aliceBusinessBank,
    bobDebit,
    bobPayPal,
    bobTravelCard,
  ] = await Promise.all([
    prisma.paymentMethod.create({
      data: {
        name: "Chase Sapphire",
        type: PaymentMethodType.CREDIT_CARD,
        lastFour: "4242",
        expiryDate: withTime(new Date("2028-09-30"), 12),
        userId: alice.id,
      },
    }),
    prisma.paymentMethod.create({
      data: {
        name: "PayPal",
        type: PaymentMethodType.PAYPAL,
        userId: alice.id,
      },
    }),
    prisma.paymentMethod.create({
      data: {
        name: "Apple Pay",
        type: PaymentMethodType.APPLE_PAY,
        userId: alice.id,
      },
    }),
    prisma.paymentMethod.create({
      data: {
        name: "Mercury Ops",
        type: PaymentMethodType.BANK_TRANSFER,
        userId: alice.id,
      },
    }),
    prisma.paymentMethod.create({
      data: {
        name: "Monzo Debit",
        type: PaymentMethodType.DEBIT_CARD,
        lastFour: "5108",
        expiryDate: withTime(new Date("2027-07-31"), 12),
        userId: bob.id,
      },
    }),
    prisma.paymentMethod.create({
      data: {
        name: "PayPal Europe",
        type: PaymentMethodType.PAYPAL,
        userId: bob.id,
      },
    }),
    prisma.paymentMethod.create({
      data: {
        name: "Amex Gold",
        type: PaymentMethodType.CREDIT_CARD,
        lastFour: "9001",
        expiryDate: withTime(new Date("2029-01-31"), 12),
        userId: bob.id,
      },
    }),
  ]);

  const aliceUpcomingTwoDays = nextMonthlyRenewal(2);
  const aliceUpcomingThreeDays = nextMonthlyRenewal(3);
  const aliceUpcomingSixDays = nextMonthlyRenewal(6);
  const aliceUpcomingTenDays = nextMonthlyRenewal(10);
  const aliceUpcomingTwelveDays = nextMonthlyRenewal(12);
  const aliceYearlyFourDays = nextYearlyRenewal(4);
  const aliceYearlyTwentyTwoDays = nextYearlyRenewal(22);
  const bobUpcomingFiveDays = nextMonthlyRenewal(5);
  const bobUpcomingEightDays = nextMonthlyRenewal(8);
  const bobYearlySixDays = nextYearlyRenewal(6);

  const [
    netflix,
    notion,
    ,
    classpass,
    xboxGamePass,
    ,
    ,
    wsj,
    ,
    youtubePremium,
    ,
    linear,
    eurostarPlus,
    ,
    ,
  ] = await Promise.all([
    prisma.subscription.create({
      data: {
        name: "Netflix",
        cost: 22.99,
        currency: "USD",
        billingFrequency: "monthly",
        startDate: yearsAgoFrom(aliceUpcomingTwoDays, 3),
        endDate: null,
        notes: "4K family plan used to demo upcoming renewals.",
        userId: alice.id,
        categoryId: aliceStreaming.id,
        paymentMethodId: aliceVisa.id,
      },
    }),
    prisma.subscription.create({
      data: {
        name: "Notion Plus",
        cost: 96,
        currency: "USD",
        billingFrequency: "yearly",
        startDate: yearsAgoFrom(aliceYearlyFourDays, 2),
        endDate: null,
        notes: "Annual billing keeps the analytics charts from being all-monthly.",
        userId: alice.id,
        categoryId: aliceProductivity.id,
        paymentMethodId: alicePayPal.id,
      },
    }),
    prisma.subscription.create({
      data: {
        name: "Vercel Pro",
        cost: 20,
        currency: "USD",
        billingFrequency: "monthly",
        startDate: yearsAgoFrom(aliceUpcomingTwelveDays, 1),
        endDate: null,
        notes: "Intentionally uncategorized to exercise fallback states in analytics.",
        userId: alice.id,
        paymentMethodId: aliceBusinessBank.id,
      },
    }),
    prisma.subscription.create({
      data: {
        name: "ClassPass",
        cost: 79,
        currency: "USD",
        billingFrequency: "monthly",
        startDate: yearsAgoFrom(aliceUpcomingThreeDays, 1),
        endDate: null,
        notes: "Health and wellness subscription with an imminent reminder.",
        userId: alice.id,
        categoryId: aliceFitness.id,
        paymentMethodId: aliceApplePay.id,
      },
    }),
    prisma.subscription.create({
      data: {
        name: "Xbox Game Pass",
        cost: 19.99,
        currency: "USD",
        billingFrequency: "monthly",
        startDate: yearsAgoFrom(aliceUpcomingSixDays, 2),
        endDate: null,
        notes: "Gaming example that lands inside the 7-day renewal window.",
        userId: alice.id,
        categoryId: aliceGaming.id,
        paymentMethodId: aliceVisa.id,
      },
    }),
    prisma.subscription.create({
      data: {
        name: "GitHub Copilot",
        cost: 10,
        currency: "USD",
        billingFrequency: "monthly",
        startDate: yearsAgoFrom(aliceUpcomingTenDays, 1),
        endDate: null,
        notes: "Developer tooling subscription for a SaaS-heavy showcase.",
        userId: alice.id,
        categoryId: aliceProductivity.id,
        paymentMethodId: aliceBusinessBank.id,
      },
    }),
    prisma.subscription.create({
      data: {
        name: "Figma Professional",
        cost: 16,
        currency: "USD",
        billingFrequency: "monthly",
        startDate: monthsAgo(5, 18),
        endDate: null,
        notes: "Recent subscription so it appears in the recent activity card.",
        userId: alice.id,
        categoryId: aliceProductivity.id,
        paymentMethodId: aliceBusinessBank.id,
      },
    }),
    prisma.subscription.create({
      data: {
        name: "Wall Street Journal",
        cost: 38.99,
        currency: "USD",
        billingFrequency: "yearly",
        startDate: yearsAgoFrom(aliceYearlyTwentyTwoDays, 1),
        endDate: null,
        notes: "Annual news subscription with a long lead reminder.",
        userId: alice.id,
        categoryId: aliceNews.id,
        paymentMethodId: aliceVisa.id,
      },
    }),
    prisma.subscription.create({
      data: {
        name: "Disney+ Legacy",
        cost: 13.99,
        currency: "USD",
        billingFrequency: "monthly",
        startDate: withTime(new Date("2022-03-09"), 9),
        endDate: withTime(new Date("2024-11-09"), 9),
        notes: "Cancelled service kept for historical trend lines.",
        userId: alice.id,
        categoryId: aliceStreaming.id,
        paymentMethodId: alicePayPal.id,
      },
    }),
    prisma.subscription.create({
      data: {
        name: "YouTube Premium",
        cost: 12.99,
        currency: "EUR",
        billingFrequency: "monthly",
        startDate: yearsAgoFrom(bobUpcomingFiveDays, 2),
        endDate: null,
        notes: "Cross-currency entertainment subscription for Bob.",
        userId: bob.id,
        categoryId: bobEntertainment.id,
        paymentMethodId: bobDebit.id,
      },
    }),
    prisma.subscription.create({
      data: {
        name: "iCloud+ 2TB",
        cost: 9.99,
        currency: "EUR",
        billingFrequency: "monthly",
        startDate: yearsAgoFrom(bobUpcomingEightDays, 1),
        endDate: null,
        notes: "Utility-style subscription outside the 7-day window.",
        userId: bob.id,
        categoryId: bobUtilities.id,
        paymentMethodId: bobDebit.id,
      },
    }),
    prisma.subscription.create({
      data: {
        name: "Linear Business",
        cost: 120,
        currency: "EUR",
        billingFrequency: "yearly",
        startDate: yearsAgoFrom(bobYearlySixDays, 1),
        endDate: null,
        notes: "Annual work subscription with reminders and currency conversion.",
        userId: bob.id,
        categoryId: bobWork.id,
        paymentMethodId: bobPayPal.id,
      },
    }),
    prisma.subscription.create({
      data: {
        name: "Eurostar Plus",
        cost: 14.99,
        currency: "GBP",
        billingFrequency: "monthly",
        startDate: monthsAgo(7, 11),
        endDate: null,
        notes: "GBP travel subscription to exercise currency normalization.",
        userId: bob.id,
        categoryId: bobTravel.id,
        paymentMethodId: bobTravelCard.id,
      },
    }),
    prisma.subscription.create({
      data: {
        name: "Mullvad VPN",
        cost: 5,
        currency: "EUR",
        billingFrequency: "weekly",
        startDate: withTime(addDays(new Date(), -6), 9),
        endDate: null,
        notes: "Weekly plan to populate the calendar with recurring dates.",
        userId: bob.id,
        categoryId: bobUtilities.id,
        paymentMethodId: bobDebit.id,
      },
    }),
    prisma.subscription.create({
      data: {
        name: "Airport Lounge Club",
        cost: 89,
        currency: "EUR",
        billingFrequency: "yearly",
        startDate: withTime(new Date("2023-02-14"), 9),
        endDate: withTime(new Date("2025-02-14"), 9),
        notes: "Ended annual plan that keeps Bob's yearly analytics interesting.",
        userId: bob.id,
        categoryId: bobTravel.id,
        paymentMethodId: bobTravelCard.id,
      },
    }),
  ]);

  const [
    aliceEmail,
    alicePush,
    aliceBackupPush,
    bobEmail,
    bobPush,
  ] = await Promise.all([
    prisma.notificationProvider.create({
      data: {
        name: "Alice Primary Email",
        type: NotificationProviderType.EMAIL,
        smtpUser: "alice@example.com",
        userId: alice.id,
      },
    }),
    prisma.notificationProvider.create({
      data: {
        name: "Alice iPhone Push",
        type: NotificationProviderType.PUSH,
        webhookUrl: "https://example.com/hooks/alice-iphone",
        webhookSecret: "alice-push-demo",
        userId: alice.id,
      },
    }),
    prisma.notificationProvider.create({
      data: {
        name: "Alice Slack Relay",
        type: NotificationProviderType.PUSH,
        webhookUrl: "https://example.com/hooks/alice-slack",
        webhookSecret: "alice-slack-demo",
        userId: alice.id,
      },
    }),
    prisma.notificationProvider.create({
      data: {
        name: "Bob Email",
        type: NotificationProviderType.EMAIL,
        smtpUser: "bob@example.com",
        userId: bob.id,
      },
    }),
    prisma.notificationProvider.create({
      data: {
        name: "Bob Travel Push",
        type: NotificationProviderType.PUSH,
        webhookUrl: "https://example.com/hooks/bob-travel",
        webhookSecret: "bob-push-demo",
        userId: bob.id,
      },
    }),
  ]);

  const reminderSeeds: Array<{
    subscriptionId: string;
    userId: string;
    reminderDate: Date;
    preset: ReminderPreset;
    daysBefore: number | null;
    nextSendAt: Date | null;
    lastSentAt?: Date | null;
    lastErrorAt?: Date | null;
    lastErrorMessage?: string | null;
    isRead?: boolean;
    providerIds: string[];
  }> = [
    {
      subscriptionId: netflix.id,
      userId: alice.id,
      reminderDate: aliceUpcomingTwoDays,
      preset: ReminderPreset.ONE_DAY_BEFORE,
      daysBefore: 1,
      nextSendAt: withTime(addDays(aliceUpcomingTwoDays, -1), 8),
      isRead: false,
      providerIds: [aliceEmail.id, alicePush.id],
    },
    {
      subscriptionId: classpass.id,
      userId: alice.id,
      reminderDate: aliceUpcomingThreeDays,
      preset: ReminderPreset.ONE_DAY_BEFORE,
      daysBefore: 1,
      nextSendAt: withTime(addDays(aliceUpcomingThreeDays, -1), 7, 30),
      isRead: false,
      providerIds: [alicePush.id],
    },
    {
      subscriptionId: xboxGamePass.id,
      userId: alice.id,
      reminderDate: aliceUpcomingSixDays,
      preset: ReminderPreset.THREE_DAYS_BEFORE,
      daysBefore: 3,
      nextSendAt: withTime(addDays(aliceUpcomingSixDays, -3), 9),
      lastSentAt: withTime(addDays(new Date(), -27), 9),
      isRead: true,
      providerIds: [aliceEmail.id, aliceBackupPush.id],
    },
    {
      subscriptionId: notion.id,
      userId: alice.id,
      reminderDate: withTime(addDays(aliceYearlyFourDays, -2), 10),
      preset: ReminderPreset.CUSTOM,
      daysBefore: null,
      nextSendAt: withTime(addDays(aliceYearlyFourDays, -2), 10),
      isRead: false,
      providerIds: [aliceEmail.id],
    },
    {
      subscriptionId: wsj.id,
      userId: alice.id,
      reminderDate: withTime(addDays(aliceYearlyTwentyTwoDays, -7), 9),
      preset: ReminderPreset.ONE_WEEK_BEFORE,
      daysBefore: 7,
      nextSendAt: withTime(addDays(aliceYearlyTwentyTwoDays, -7), 9),
      isRead: false,
      providerIds: [aliceEmail.id],
    },
    {
      subscriptionId: youtubePremium.id,
      userId: bob.id,
      reminderDate: withTime(addDays(bobUpcomingFiveDays, -1), 8),
      preset: ReminderPreset.ONE_DAY_BEFORE,
      daysBefore: 1,
      nextSendAt: withTime(addDays(bobUpcomingFiveDays, -1), 8),
      isRead: false,
      providerIds: [bobEmail.id, bobPush.id],
    },
    {
      subscriptionId: linear.id,
      userId: bob.id,
      reminderDate: withTime(addDays(bobYearlySixDays, -3), 9),
      preset: ReminderPreset.THREE_DAYS_BEFORE,
      daysBefore: 3,
      nextSendAt: withTime(addDays(bobYearlySixDays, -3), 9),
      isRead: false,
      providerIds: [bobEmail.id],
    },
    {
      subscriptionId: eurostarPlus.id,
      userId: bob.id,
      reminderDate: withTime(addDays(new Date(), -1), 7),
      preset: ReminderPreset.CUSTOM,
      daysBefore: null,
      nextSendAt: withTime(addDays(new Date(), 14), 7),
      lastErrorAt: withTime(addDays(new Date(), -1), 7),
      lastErrorMessage: "Webhook endpoint timed out during a demo dry run.",
      isRead: true,
      providerIds: [bobPush.id],
    },
  ];

  for (const reminder of reminderSeeds) {
    await prisma.reminder.create({
      data: {
        subscriptionId: reminder.subscriptionId,
        userId: reminder.userId,
        reminderDate: reminder.reminderDate,
        preset: reminder.preset,
        daysBefore: reminder.daysBefore,
        nextSendAt: reminder.nextSendAt,
        lastSentAt: reminder.lastSentAt ?? null,
        lastErrorAt: reminder.lastErrorAt ?? null,
        lastErrorMessage: reminder.lastErrorMessage ?? null,
        isRead: reminder.isRead ?? false,
        notificationProviders: {
          connect: reminder.providerIds.map((id) => ({ id })),
        },
      },
    });
  }

  console.log("Comprehensive demo seed completed successfully.");
  console.log("Demo users:");
  console.log("  alice@example.com / hashedpassword1");
  console.log("  bob@example.com / hashedpassword2");
  console.log("Showcase highlights:");
  console.log("  - multiple billing frequencies and currencies");
  console.log("  - active, ended, categorized, and uncategorized subscriptions");
  console.log("  - reminders with custom and preset schedules");
  console.log("  - notification providers connected to reminders");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
