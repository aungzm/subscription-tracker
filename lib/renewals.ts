import {
  addMonths,
  addYears,
  differenceInCalendarDays,
  isAfter,
  setMonth,
  setYear,
  startOfDay,
} from "date-fns"

export type RenewalBadgeStatus = "today" | "this-week" | "future" | "past"

export function getNextBillingDateValue(
  startDate: Date,
  billingFrequency: string,
  now: Date = new Date()
): Date {
  if (billingFrequency === "monthly") {
    let next = setMonth(new Date(now), now.getMonth())
    next.setDate(startDate.getDate())
    if (isAfter(now, next)) {
      next = addMonths(next, 1)
    }
    return next
  }

  if (billingFrequency === "yearly") {
    let next = setYear(
      setMonth(new Date(now), new Date(startDate).getMonth()),
      now.getFullYear()
    )
    next.setDate(new Date(startDate).getDate())
    if (isAfter(now, next)) {
      next = addYears(next, 1)
    }
    return next
  }

  return new Date(startDate)
}

export function getRenewalTiming(date: Date, now: Date = new Date()) {
  const daysUntil = differenceInCalendarDays(startOfDay(date), startOfDay(now))

  if (daysUntil < 0) {
    return {
      daysUntil,
      countdownLabel: "Past due",
      urgencyLabel: null,
      status: "past" as RenewalBadgeStatus,
    }
  }

  if (daysUntil === 0) {
    return {
      daysUntil,
      countdownLabel: "Due today",
      urgencyLabel: "Renewing today",
      status: "today" as RenewalBadgeStatus,
    }
  }

  if (daysUntil <= 7) {
    return {
      daysUntil,
      countdownLabel: `${daysUntil} day${daysUntil === 1 ? "" : "s"} left`,
      urgencyLabel: "Renewing this week",
      status: "this-week" as RenewalBadgeStatus,
    }
  }

  return {
    daysUntil,
    countdownLabel: `${daysUntil} day${daysUntil === 1 ? "" : "s"} left`,
    urgencyLabel: null,
    status: "future" as RenewalBadgeStatus,
  }
}
