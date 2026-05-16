import {
  dbValueToReminderPreset,
  getDaysBeforeFromPreset,
  getReminderNextSendAt,
  reminderPresetToDbValue,
} from "@/lib/reminder-schedule"

describe("reminder schedule helpers", () => {
  const startDate = new Date("2026-05-20T10:00:00.000Z")
  const now = new Date("2026-05-16T10:00:00.000Z")

  it("maps UI presets to persistence values", () => {
    expect(reminderPresetToDbValue("1-week-before")).toBe("ONE_WEEK_BEFORE")
    expect(dbValueToReminderPreset("THREE_DAYS_BEFORE")).toBe("3-days-before")
  })

  it("returns null daysBefore for custom reminders", () => {
    expect(getDaysBeforeFromPreset("custom")).toBeNull()
  })

  it("computes next send at for preset reminders", () => {
    const result = getReminderNextSendAt({
      reminderPreset: "1-day-before",
      reminderDate: startDate,
      startDate,
      billingFrequency: "monthly",
      now,
    })

    expect(result.toISOString()).toBe("2026-05-19T10:00:00.000Z")
  })

  it("keeps the picked date for custom reminders", () => {
    const customDate = new Date("2026-05-18T10:00:00.000Z")

    const result = getReminderNextSendAt({
      reminderPreset: "custom",
      reminderDate: customDate,
      startDate,
      billingFrequency: "monthly",
      now,
    })

    expect(result.toISOString()).toBe(customDate.toISOString())
  })
})
