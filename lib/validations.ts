import { z } from "zod";

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
  currency: z.string().min(1).optional(),
});

export const currencyUpdateSchema = z.object({
  currency: z.string().min(1, "Currency is required"),
});

// Subscription schemas
export const subscriptionCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  cost: z.number().positive("Cost must be positive"),
  billingFrequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  currency: z.string().min(1, "Currency is required"),
  category: z.string().nullable().optional(),
  paymentMethod: z.string().nullable().optional(),
});

export const subscriptionUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  cost: z.number().positive().optional(),
  billingFrequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  currency: z.string().min(1).optional(),
  category: z.string().nullable().optional(),
  paymentMethod: z.string().nullable().optional(),
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
  type: z.enum(paymentMethodTypes, { errorMap: () => ({ message: "Invalid payment method type" }) }),
  lastFour: z
    .string()
    .length(4, "Last four must be exactly 4 digits")
    .regex(/^\d{4}$/, "Last four must be digits only")
    .nullable()
    .optional(),
  expiryDate: z.string().nullable().optional(),
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
  expiryDate: z.string().nullable().optional(),
});

// Reminder schemas
export const reminderCreateSchema = z.object({
  subscriptionId: z.string().min(1, "Subscription ID is required"),
  reminderDate: z.string().min(1, "Reminder date is required"),
  notificationProviderIds: z.array(z.string()).min(1, "At least one notification provider is required"),
  id: z.string().optional(), // For updates
});

// Notification provider schemas
export const notificationProviderCreateSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    type: z.enum(["EMAIL", "PUSH"]),
    smtpServer: z.string().nullable().optional(),
    smtpPort: z.number().nullable().optional(),
    smtpUser: z.string().nullable().optional(),
    smtpPassword: z.string().nullable().optional(),
    webhookUrl: z.string().url().nullable().optional(),
    webhookSecret: z.string().nullable().optional(),
  })
  .refine(
    (data) => {
      const hasSmtp = data.smtpServer || data.smtpPort || data.smtpUser || data.smtpPassword;
      const hasWebhook = data.webhookUrl || data.webhookSecret;
      return !(hasSmtp && hasWebhook);
    },
    {
      message: "Provide either SMTP or Webhook configuration, not both",
    }
  );

export const notificationProviderUpdateSchema = notificationProviderCreateSchema;

// Type exports
export type RegisterInput = z.infer<typeof registerSchema>;
export type PasswordUpdateInput = z.infer<typeof passwordUpdateSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type CurrencyUpdateInput = z.infer<typeof currencyUpdateSchema>;
export type SubscriptionCreateInput = z.infer<typeof subscriptionCreateSchema>;
export type SubscriptionUpdateInput = z.infer<typeof subscriptionUpdateSchema>;
export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
export type PaymentMethodCreateInput = z.infer<typeof paymentMethodCreateSchema>;
export type PaymentMethodUpdateInput = z.infer<typeof paymentMethodUpdateSchema>;
export type ReminderCreateInput = z.infer<typeof reminderCreateSchema>;
export type NotificationProviderInput = z.infer<typeof notificationProviderCreateSchema>;
