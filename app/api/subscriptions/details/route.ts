// api/subscriptions/details/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { addDays, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { auth } from "@/lib/auth";
import {
  prefetchExchangeRates,
  convertCurrencyWithRatesSafe,
  normalizeToMonthlyCostSyncSafe,
} from "@/lib/currency";

type SubscriptionWithRelations = {
  id: string;
  name: string;
  cost: number;
  currency: string;
  billingFrequency: string;
  startDate: Date;
  endDate: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  categoryId: string | null;
  paymentMethodId: string | null;
  category: { id: string; name: string; color: string } | null;
  paymentMethod: { id: string; name: string } | null;
  reminders: { id: string; reminderDate: Date }[];
};

type TrendMetric = {
  delta: number;
  percentageChange: number | null;
  comparisonLabel: string;
};

function incrementDateByFrequency(date: Date, billingFrequency: string) {
  const next = new Date(date);

  if (billingFrequency === "monthly") {
    next.setMonth(next.getMonth() + 1);
    return next;
  }

  if (billingFrequency === "yearly") {
    next.setFullYear(next.getFullYear() + 1);
    return next;
  }

  if (billingFrequency === "weekly") {
    next.setDate(next.getDate() + 7);
    return next;
  }

  return next;
}

function isSubscriptionActiveOnDate(sub: SubscriptionWithRelations, date: Date) {
  return sub.startDate <= date && (!sub.endDate || sub.endDate > date);
}

function hasRenewalInWindow(
  sub: SubscriptionWithRelations,
  windowStart: Date,
  windowEnd: Date
) {
  const effectiveEnd =
    sub.endDate && sub.endDate < windowEnd ? sub.endDate : windowEnd;

  if (effectiveEnd < windowStart) {
    return false;
  }

  if (
    sub.billingFrequency !== "monthly" &&
    sub.billingFrequency !== "yearly" &&
    sub.billingFrequency !== "weekly"
  ) {
    return isWithinInterval(sub.startDate, { start: windowStart, end: effectiveEnd });
  }

  let occurrence = new Date(sub.startDate);

  while (occurrence < windowStart) {
    const nextOccurrence = incrementDateByFrequency(occurrence, sub.billingFrequency);
    if (nextOccurrence.getTime() === occurrence.getTime()) {
      break;
    }
    occurrence = nextOccurrence;
  }

  return occurrence <= effectiveEnd && occurrence >= windowStart;
}

function buildTrendMetric(
  currentValue: number,
  previousValue: number,
  comparisonLabel: string
): TrendMetric {
  const delta = Number((currentValue - previousValue).toFixed(2));
  const percentageChange =
    previousValue === 0 ? null : Number((((currentValue - previousValue) / previousValue) * 100).toFixed(1));

  return {
    delta,
    percentageChange,
    comparisonLabel,
  };
}

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  // Get user's preferred currency
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currency: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const userCurrency = user.currency;

  // Get all subscriptions for the user
  const subscriptions = await prisma.subscription.findMany({
    where: { userId },
    include: {
      category: true,
      paymentMethod: true,
      reminders: true,
    },
    orderBy: { startDate: "desc" },
  });

  // Recent Subscriptions (last 5)
  const recentSubscriptions = subscriptions.slice(0, 5);

  // Calculate upcoming renewals (next 7 days)
  const today = startOfDay(new Date());
  const weekFromNow = endOfDay(addDays(today, 7));
  const comparisonDate = startOfDay(addDays(today, -30));
  const previousWindowStart = startOfDay(addDays(today, -7));
  const previousWindowEnd = endOfDay(addDays(today, -1));

  // Helper to get next renewal date
  function getNextRenewalDate(sub: SubscriptionWithRelations) {
    const { billingFrequency, startDate } = sub;
    const now = new Date();
    let nextDate = new Date(startDate);

    while (nextDate < now) {
      if (billingFrequency === "monthly") {
        nextDate.setMonth(nextDate.getMonth() + 1);
      } else if (billingFrequency === "yearly") {
        nextDate.setFullYear(nextDate.getFullYear() + 1);
      } else if (billingFrequency === "weekly") {
        nextDate.setDate(nextDate.getDate() + 7);
      } else {
        // Custom or unknown, just return startDate
        break;
      }
    }
    return nextDate;
  }

  const upcomingRenewals = subscriptions
    .map((sub) => ({
      ...sub,
      nextRenewal: getNextRenewalDate(sub),
    }))
    .filter(
      (sub) =>
        isWithinInterval(sub.nextRenewal, { start: today, end: weekFromNow }) &&
        (!sub.endDate || sub.nextRenewal <= sub.endDate)
    )
    .sort((a, b) => a.nextRenewal.getTime() - b.nextRenewal.getTime());

  // Pre-fetch all exchange rates needed (batch API calls)
  const uniqueCurrencies = [...new Set(subscriptions.map((s) => s.currency))];
  const ratesMap = await prefetchExchangeRates(uniqueCurrencies);

  // Track conversion failures
  const conversionErrors: string[] = [];

  // Totals with currency conversion (now synchronous lookups)
  let totalMonthly = 0;
  let totalYearly = 0;
  let activeSubscriptions = 0;
  let comparisonMonthly = 0;
  let comparisonYearly = 0;
  let comparisonActiveSubscriptions = 0;

  for (const sub of subscriptions) {
    if (isSubscriptionActiveOnDate(sub, today)) {
      activeSubscriptions += 1;

      // Convert subscription cost to user's preferred currency (sync lookup)
      const result = normalizeToMonthlyCostSyncSafe(
        sub.cost,
        sub.currency,
        sub.billingFrequency,
        userCurrency,
        ratesMap
      );

      if (!result.success && result.error) {
        conversionErrors.push(`${sub.name}: ${result.error}`);
      }

      totalMonthly += result.amount;
      totalYearly += result.amount * 12;
    }

    if (isSubscriptionActiveOnDate(sub, comparisonDate)) {
      comparisonActiveSubscriptions += 1;

      const comparisonResult = normalizeToMonthlyCostSyncSafe(
        sub.cost,
        sub.currency,
        sub.billingFrequency,
        userCurrency,
        ratesMap
      );

      if (!comparisonResult.success && comparisonResult.error) {
        conversionErrors.push(`${sub.name}: ${comparisonResult.error}`);
      }

      comparisonMonthly += comparisonResult.amount;
      comparisonYearly += comparisonResult.amount * 12;
    }
  }

  const previousUpcomingRenewals = subscriptions.filter((sub) =>
    hasRenewalInWindow(sub, previousWindowStart, previousWindowEnd)
  ).length;

  // Convert costs for recent subscriptions (sync lookups)
  const convertedRecentSubscriptions = recentSubscriptions.map((sub) => {
    const result = convertCurrencyWithRatesSafe(sub.cost, sub.currency, userCurrency, ratesMap);
    if (!result.success && result.error) {
      conversionErrors.push(`${sub.name}: ${result.error}`);
    }
    return {
      id: sub.id,
      name: sub.name,
      cost: Number(result.amount.toFixed(2)),
      currency: result.success ? userCurrency : sub.currency,
      originalCost: sub.cost,
      originalCurrency: sub.currency,
      billingFrequency: sub.billingFrequency,
      startDate: sub.startDate,
      category: sub.category?.name,
      category_color: sub.category?.color,
      conversionFailed: !result.success,
    };
  });

  // Convert costs for upcoming renewals (sync lookups)
  const convertedUpcomingRenewals = upcomingRenewals.map((sub) => {
    const result = convertCurrencyWithRatesSafe(sub.cost, sub.currency, userCurrency, ratesMap);
    if (!result.success && result.error) {
      conversionErrors.push(`${sub.name}: ${result.error}`);
    }
    return {
      id: sub.id,
      name: sub.name,
      nextRenewal: sub.nextRenewal,
      cost: Number(result.amount.toFixed(2)),
      currency: result.success ? userCurrency : sub.currency,
      originalCost: sub.cost,
      originalCurrency: sub.currency,
      billingFrequency: sub.billingFrequency,
      conversionFailed: !result.success,
    };
  });

  // Deduplicate conversion errors
  const uniqueErrors = [...new Set(conversionErrors)];

  return NextResponse.json({
    totals: {
      totalMonthly: Number(totalMonthly.toFixed(2)),
      totalYearly: Number(totalYearly.toFixed(2)),
      currency: userCurrency,
      activeSubscriptions,
      upcomingRenewals: upcomingRenewals.length,
      trends: {
        totalMonthly: buildTrendMetric(totalMonthly, comparisonMonthly, "vs 30 days ago"),
        totalYearly: buildTrendMetric(totalYearly, comparisonYearly, "vs 30 days ago"),
        activeSubscriptions: buildTrendMetric(
          activeSubscriptions,
          comparisonActiveSubscriptions,
          "vs 30 days ago"
        ),
        upcomingRenewals: buildTrendMetric(
          upcomingRenewals.length,
          previousUpcomingRenewals,
          "vs previous 7 days"
        ),
      },
    },
    recentSubscriptions: convertedRecentSubscriptions,
    upcomingRenewals: convertedUpcomingRenewals,
    ...(uniqueErrors.length > 0 && {
      warnings: {
        conversionErrors: uniqueErrors,
        message: "Some currency conversions failed. Amounts shown in original currency.",
      },
    }),
  });
}
