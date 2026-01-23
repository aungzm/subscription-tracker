import type {
  User,
  Category,
  Subscription,
  PaymentMethod,
  Reminder,
  NotificationProvider,
} from "@prisma/client";
import {
  USER_IDS,
  CATEGORY_IDS,
  SUBSCRIPTION_IDS,
  PAYMENT_METHOD_IDS,
  REMINDER_IDS,
  NOTIFICATION_PROVIDER_IDS,
} from "../../prisma/test-ids";

export function createMockUser(overrides: Partial<User> = {}): User {
  const now = new Date();
  return {
    id: USER_IDS.ALICE,
    name: "Alice Test",
    email: "alice@test.com",
    emailVerified: null,
    password: "hashedpassword",
    image: null,
    currency: "USD",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createMockCategory(overrides: Partial<Category> = {}): Category {
  const now = new Date();
  return {
    id: CATEGORY_IDS.STREAMING,
    name: "Streaming",
    color: "#FF0000",
    userId: USER_IDS.ALICE,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createMockSubscription(
  overrides: Partial<Subscription> = {}
): Subscription {
  const now = new Date();
  return {
    id: SUBSCRIPTION_IDS.NETFLIX,
    name: "Netflix",
    cost: 15.99,
    currency: "USD",
    billingFrequency: "monthly",
    startDate: now,
    endDate: null,
    notes: null,
    isShared: false,
    userId: USER_IDS.ALICE,
    categoryId: CATEGORY_IDS.STREAMING,
    paymentMethodId: PAYMENT_METHOD_IDS.VISA,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createMockPaymentMethod(
  overrides: Partial<PaymentMethod> = {}
): PaymentMethod {
  const now = new Date();
  return {
    id: PAYMENT_METHOD_IDS.VISA,
    name: "Visa",
    type: "CREDIT_CARD",
    lastFour: "1234",
    expiryDate: new Date("2026-12-31"),
    userId: USER_IDS.ALICE,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createMockReminder(overrides: Partial<Reminder> = {}): Reminder {
  const now = new Date();
  const reminderDate = new Date();
  reminderDate.setDate(reminderDate.getDate() + 7);
  return {
    id: REMINDER_IDS.NETFLIX,
    subscriptionId: SUBSCRIPTION_IDS.NETFLIX,
    userId: USER_IDS.ALICE,
    reminderDate,
    isRead: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createMockNotificationProvider(
  overrides: Partial<NotificationProvider> = {}
): NotificationProvider {
  const now = new Date();
  return {
    id: NOTIFICATION_PROVIDER_IDS.ALICE_EMAIL,
    name: "Alice Email",
    type: "EMAIL",
    smtpServer: "smtp.example.com",
    smtpPort: 587,
    smtpUser: "alice@example.com",
    smtpPassword: "password",
    webhookUrl: null,
    webhookSecret: null,
    userId: USER_IDS.ALICE,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// Helper to create subscription with relations
export function createMockSubscriptionWithRelations(
  overrides: Partial<Subscription> = {},
  categoryOverrides: Partial<Category> = {},
  paymentMethodOverrides: Partial<PaymentMethod> = {}
) {
  return {
    ...createMockSubscription(overrides),
    category: createMockCategory(categoryOverrides),
    paymentMethod: createMockPaymentMethod(paymentMethodOverrides),
  };
}

// Helper to create reminder with subscription
export function createMockReminderWithSubscription(
  reminderOverrides: Partial<Reminder> = {},
  subscriptionOverrides: Partial<Subscription> = {}
) {
  return {
    ...createMockReminder(reminderOverrides),
    subscription: createMockSubscription(subscriptionOverrides),
  };
}
