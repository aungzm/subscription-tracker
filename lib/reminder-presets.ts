import { differenceInCalendarDays, startOfDay, subDays } from "date-fns"
import { getNextBillingDateValue } from "@/lib/renewals"

export type ReminderPreset =
  | "custom"
  | "1-day-before"
  | "3-days-before"
  | "1-week-before"

export const REMINDER_PRESET_OPTIONS: Array<{
  value: ReminderPreset
  label: string
  daysBefore: number | null
}> = [
  { value: "1-day-before", label: "1 day before", daysBefore: 1 },
  { value: "3-days-before", label: "3 days before", daysBefore: 3 },
  { value: "1-week-before", label: "1 week before", daysBefore: 7 },
  { value: "custom", label: "Custom date", daysBefore: null },
]

export function getPresetReminderDate(
  preset: ReminderPreset,
  startDate: Date,
  billingFrequency: string,
  now?: Date
) {
  const presetConfig = REMINDER_PRESET_OPTIONS.find(
    (option) => option.value === preset
  )

  if (!presetConfig || presetConfig.daysBefore === null) {
    return null
  }

  const nextBillingDate = getNextBillingDateValue(
    startDate,
    billingFrequency,
    now
  )
  return subDays(nextBillingDate, presetConfig.daysBefore)
}

export function detectReminderPreset(
  reminderDate: Date,
  startDate: Date,
  billingFrequency: string,
  now?: Date
): ReminderPreset {
  for (const option of REMINDER_PRESET_OPTIONS) {
    if (option.daysBefore === null) {
      continue
    }

    const presetDate = getPresetReminderDate(
      option.value,
      startDate,
      billingFrequency,
      now
    )

    if (
      presetDate &&
      differenceInCalendarDays(
        startOfDay(reminderDate),
        startOfDay(presetDate)
      ) === 0
    ) {
      return option.value
    }
  }

  return "custom"
}
