import { addDays } from "date-fns"
import { getNextBillingDateValue } from "@/lib/renewals"
import type { ReminderPreset } from "@/lib/reminder-presets"

export type ReminderPersistencePreset = Exclude<ReminderPreset, never>

export function reminderPresetToDbValue(preset: ReminderPreset) {
  switch (preset) {
    case "1-day-before":
      return "ONE_DAY_BEFORE" as const
    case "3-days-before":
      return "THREE_DAYS_BEFORE" as const
    case "1-week-before":
      return "ONE_WEEK_BEFORE" as const
    default:
      return "CUSTOM" as const
  }
}

export function dbValueToReminderPreset(
  preset: string | null | undefined
): ReminderPreset {
  switch (preset) {
    case "ONE_DAY_BEFORE":
      return "1-day-before"
    case "THREE_DAYS_BEFORE":
      return "3-days-before"
    case "ONE_WEEK_BEFORE":
      return "1-week-before"
    default:
      return "custom"
  }
}

export function getDaysBeforeFromPreset(preset: ReminderPreset) {
  switch (preset) {
    case "1-day-before":
      return 1
    case "3-days-before":
      return 3
    case "1-week-before":
      return 7
    default:
      return null
  }
}

export function getReminderNextSendAt(params: {
  reminderPreset: ReminderPreset
  reminderDate: Date
  startDate: Date
  billingFrequency: string
  now?: Date
}) {
  const { reminderPreset, reminderDate, startDate, billingFrequency, now } = params

  if (reminderPreset === "custom") {
    return reminderDate
  }

  const daysBefore = getDaysBeforeFromPreset(reminderPreset)
  if (daysBefore === null) {
    return reminderDate
  }

  const nextBillingDate = getNextBillingDateValue(startDate, billingFrequency, now)
  return addDays(nextBillingDate, -daysBefore)
}

export function getNextRecurringReminderSendAt(params: {
  startDate: Date
  billingFrequency: string
  daysBefore: number
  now?: Date
}) {
  const baseline = params.now ? addDays(params.now, 1) : addDays(new Date(), 1)
  const nextBillingDate = getNextBillingDateValue(
    params.startDate,
    params.billingFrequency,
    baseline
  )

  return addDays(nextBillingDate, -params.daysBefore)
}
