import { prisma } from "@/lib/db"
import { sendEmail, sendWebhook } from "@/lib/notification"
import {
  dbValueToReminderPreset,
  getNextRecurringReminderSendAt,
} from "@/lib/reminder-schedule"
import { getNextBillingDateValue } from "@/lib/renewals"

type DispatchResult = {
  scanned: number
  sent: number
  failed: number
  webhookFailures: number
}

function buildReminderMessage(params: {
  subscriptionName: string
  cost: number
  currency: string
  nextRenewal: Date
}) {
  return {
    subject: `${params.subscriptionName} renews soon`,
    body: [
      `Your subscription for ${params.subscriptionName} is coming up soon.`,
      `Amount: ${params.cost} ${params.currency}`,
      `Renewal date: ${params.nextRenewal.toDateString()}`,
    ].join("\n"),
  }
}

export async function runReminderDispatch(now: Date = new Date()): Promise<DispatchResult> {
  const dueReminders = await prisma.reminder.findMany({
    where: {
      nextSendAt: {
        lte: now,
      },
    },
    include: {
      subscription: true,
      user: true,
      notificationProviders: true,
    },
    orderBy: { nextSendAt: "asc" },
  })

  const result: DispatchResult = {
    scanned: dueReminders.length,
    sent: 0,
    failed: 0,
    webhookFailures: 0,
  }

  for (const reminder of dueReminders) {
    const nextRenewal = getNextBillingDateValue(
      reminder.subscription.startDate,
      reminder.subscription.billingFrequency,
      now
    )
    const message = buildReminderMessage({
      subscriptionName: reminder.subscription.name,
      cost: reminder.subscription.cost,
      currency: reminder.subscription.currency,
      nextRenewal,
    })

    try {
      await sendEmail({
        type: "EMAIL",
        to: reminder.user.email,
        message,
      })

      const webhookErrors: string[] = []
      for (const provider of reminder.notificationProviders) {
        try {
          await sendWebhook({
            type: "PUSH",
            webhookUrl: provider.webhookUrl,
            webhookSecret: provider.webhookSecret,
            message,
          })
        } catch (error) {
          result.webhookFailures += 1
          webhookErrors.push(
            `${provider.name}: ${
              error instanceof Error ? error.message : "Unknown webhook error"
            }`
          )
        }
      }

      const preset = dbValueToReminderPreset(String(reminder.preset))
      const nextSendAt =
        preset === "custom" || reminder.daysBefore === null
          ? null
          : getNextRecurringReminderSendAt({
              startDate: reminder.subscription.startDate,
              billingFrequency: reminder.subscription.billingFrequency,
              daysBefore: reminder.daysBefore,
              now,
            })

      await prisma.reminder.update({
        where: { id: reminder.id },
        data: {
          lastSentAt: now,
          nextSendAt,
          lastErrorAt: webhookErrors.length > 0 ? now : null,
          lastErrorMessage:
            webhookErrors.length > 0 ? webhookErrors.join("; ") : null,
        },
      })

      result.sent += 1
    } catch (error) {
      result.failed += 1
      await prisma.reminder.update({
        where: { id: reminder.id },
        data: {
          lastErrorAt: now,
          lastErrorMessage:
            error instanceof Error ? error.message : "Unknown reminder error",
        },
      })
    }
  }

  return result
}
