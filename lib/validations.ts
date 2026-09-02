import { z } from "zod";
import { getWebhookUrlSafetyError } from "@/lib/webhook-url";

const dateString = (fieldName: string) =>
  z
    .string()
    .min(1, `${fieldName} is required`)
    .refine((value) => !Number.isNaN(new Date(value).getTime()), {
      message: `${fieldName} must be a valid date`,
    });

const optionalDateString = (fieldName: string) =>
  dateString(fieldName).nullable().optional();

const supportedCurrencyCodes = new Set(
  (
    (Intl as unknown as {
      supportedValuesOf?: (key: "currency") => string[];
    }).supportedValuesOf?.("currency") ?? [
      "USD",
      "EUR",
      "GBP",
      "CAD",
      "AUD",
      "JPY",
      "CHF",
      "CNY",
      "INR",
    ]
  ).map((code) => code.toUpperCase())
);

function isValidCurrencyCode(value: string) {
  if (!/^[A-Z]{3}$/.test(value)) {
    return false;
  }

  return supportedCurrencyCodes.has(value);
}

const currencyCode = (fieldName = "Currency") =>
  z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .refine(isValidCurrencyCode, {
      message: `${fieldName} must be a valid ISO currency code`,
    });

const webhookUrlString = z
  .string()
  .url("Webhook URL is required")
  .refine((value) => getWebhookUrlSafetyError(value) === null, {
    message: "Webhook URL must be a public HTTPS URL",
  });

// Helper for consistent error responses
export function formatZodError(error: z.ZodError) {
  return {
    error: "Validation failed",
    details: error.flatten(),
  };
}

// Auth schemas
export const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const passwordUpdateSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    repeatPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.repeatPassword, {
    message: "New passwords don't match",
    path: ["repeatPassword"],
  });

// User schemas
export const profileUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  image: z.string().url().nullable().optional(),
  currency: currencyCode().optional(),
});

export const currencyUpdateSchema = z.object({
  currency: currencyCode(),
});

// Subscription schemas
export const billingFrequencyValues = ["weekly", "monthly", "yearly", "custom"] as const;
export const reminderPresetValues = [
  "custom",
  "1-day-before",
  "3-days-before",
  "1-week-before",
] as const;

export const subscriptionCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  cost: z.number().positive("Cost must be positive"),
  billingFrequency: z.enum(billingFrequencyValues),
  startDate: dateString("Start date"),
  endDate: optionalDateString("End date"),
  notes: z.string().nullable().optional(),
  currency: currencyCode(),
  category: z.string().nullable().optional(),
  paymentMethod: z.string().nullable().optional(),
});

export const subscriptionUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  cost: z.number().positive().optional(),
  billingFrequency: z.enum(billingFrequencyValues).optional(),
  startDate: dateString("Start date").optional(),
  endDate: optionalDateString("End date"),
  notes: z.string().nullable().optional(),
  currency: currencyCode().optional(),
  category: z.string().nullable().optional(),
  paymentMethod: z.string().nullable().optional(),
});

export const subscriptionImportItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  cost: z.number().positive("Cost must be positive"),
  currency: currencyCode(),
  billingFrequency: z.literal("monthly"),
  startDate: dateString("Start date"),
  category: z.string().nullable().optional(),
  paymentMethod: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const subscriptionImportSchema = z.object({
  subscriptions: z
    .array(subscriptionImportItemSchema)
    .min(1, "Select at least one subscription")
    .max(50, "Import at most 50 subscriptions at a time"),
});

// Category schemas
export const categoryCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format")
    .optional()
    .default("#0000FF"),
});

export const categoryUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format")
    .optional(),
});

// Payment method schemas
const paymentMethodTypes = [
  "CREDIT_CARD",
  "DEBIT_CARD",
  "PAYPAL",
  "APPLE_PAY",
  "GOOGLE_PAY",
  "CRYPTO",
  "BANK_TRANSFER",
  "OTHER",
] as const;

export const paymentMethodCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(paymentMethodTypes, { message: "Invalid payment method type" }),
  lastFour: z
    .string()
    .length(4, "Last four must be exactly 4 digits")
    .regex(/^\d{4}$/, "Last four must be digits only")
    .nullable()
    .optional(),
  expiryDate: optionalDateString("Expiry date"),
});

export const paymentMethodUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(paymentMethodTypes).optional(),
  lastFour: z
    .string()
    .length(4)
    .regex(/^\d{4}$/)
    .nullable()
    .optional(),
  expiryDate: optionalDateString("Expiry date"),
});

// Reminder schemas
export const reminderCreateSchema = z.object({
  subscriptionId: z.string().min(1, "Subscription ID is required"),
  reminderDate: dateString("Reminder date"),
  reminderPreset: z.enum(reminderPresetValues).optional().default("custom"),
  nextSendAt: dateString("Next send date"),
  notificationProviderIds: z.array(z.string()).optional().default([]),
  id: z.string().optional(), // For updates
});

export const reminderUpdateSchema = z.object({
  reminderDate: dateString("Reminder date").optional(),
  nextSendAt: optionalDateString("Next send date"),
  isRead: z.boolean().optional(),
});

// Notification provider schemas
export const notificationProviderCreateSchema = z.discriminatedUnion("type", [
  z.object({
    name: z.string().min(1, "Name is required"),
    type: z.literal("EMAIL"),
    email: z.string().email("Valid email is required"),
  }),
  z.object({
    name: z.string().min(1, "Name is required"),
    type: z.literal("PUSH"),
    webhookUrl: webhookUrlString,
    webhookSecret: z.string().nullable().optional(),
  }),
]);

export const notificationProviderUpdateSchema = notificationProviderCreateSchema;

// Notification test/send schema (for sending test notifications)
export const sendNotificationSchema = z.object({
  name: z.string().min(1).optional().default("Notification"),
  type: z.enum(["EMAIL", "PUSH"]),
  email: z.string().email().optional().nullable(),
  webhookUrl: webhookUrlString.optional().nullable(),
  webhookSecret: z.string().optional().nullable(),
  message: z.object({
    subject: z.string().min(1),
    body: z.string().min(1),
  }),
});

// Type exports
export type RegisterInput = z.infer<typeof registerSchema>;
export type PasswordUpdateInput = z.infer<typeof passwordUpdateSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type CurrencyUpdateInput = z.infer<typeof currencyUpdateSchema>;
export type SubscriptionCreateInput = z.infer<typeof subscriptionCreateSchema>;
export type SubscriptionUpdateInput = z.infer<typeof subscriptionUpdateSchema>;
export type SubscriptionImportInput = z.infer<typeof subscriptionImportSchema>;
export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
export type PaymentMethodCreateInput = z.infer<typeof paymentMethodCreateSchema>;
export type PaymentMethodUpdateInput = z.infer<typeof paymentMethodUpdateSchema>;
export type ReminderCreateInput = z.infer<typeof reminderCreateSchema>;
export type ReminderUpdateInput = z.infer<typeof reminderUpdateSchema>;
export type NotificationProviderInput = z.infer<typeof notificationProviderCreateSchema>;
export type SendNotificationInput = z.infer<typeof sendNotificationSchema>;
