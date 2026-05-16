import {
  detectReminderPreset,
  getPresetReminderDate,
} from "@/lib/reminder-presets"

describe("reminder preset helpers", () => {
  const now = new Date("2026-05-16T10:00:00.000Z")
  const startDate = new Date("2026-05-20T10:00:00.000Z")

  it("calculates the 1 day before preset from the next billing date", () => {
    const result = getPresetReminderDate("1-day-before", startDate, "monthly", now)

    expect(result?.toISOString()).toBe("2026-05-19T10:00:00.000Z")
  })

  it("detects the 3 days before preset for an existing reminder date", () => {
    const reminderDate = new Date("2026-05-17T18:30:00.000Z")

    const result = detectReminderPreset(
      reminderDate,
      startDate,
      "monthly",
      now
    )

    expect(result).toBe("3-days-before")
  })

  it("falls back to custom when a reminder date does not match a preset", () => {
    const reminderDate = new Date("2026-05-18T10:00:00.000Z")

    const result = detectReminderPreset(
      reminderDate,
      startDate,
      "monthly",
      now
    )

    expect(result).toBe("custom")
  })
})
