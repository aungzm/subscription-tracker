// api/subscriptions/details/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db"; // Adjust import as needed
import { addDays, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { auth } from "@/lib/auth";
import { convertCurrency, normalizeToMonthlyCost } from "@/lib/currency";

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

  // Helper to get next renewal date
  function getNextRenewalDate(sub: any) {
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

  // Totals with currency conversion
  let totalMonthly = 0;
  let totalYearly = 0;
  let activeSubscriptions = 0;

  for (const sub of subscriptions) {
    if (!sub.endDate || new Date(sub.endDate) > today) {
      activeSubscriptions += 1;

      // Convert subscription cost to user's preferred currency
      const monthlyCostInUserCurrency = await normalizeToMonthlyCost(
        sub.cost,
        sub.currency,
        sub.billingFrequency,
        userCurrency
      );

      totalMonthly += monthlyCostInUserCurrency;
      totalYearly += monthlyCostInUserCurrency * 12;
    }
  }

  // Convert costs for recent subscriptions
  const convertedRecentSubscriptions = await Promise.all(
    recentSubscriptions.map(async (sub) => {
      const convertedCost = await convertCurrency(sub.cost, sub.currency, userCurrency);
      return {
        id: sub.id,
        name: sub.name,
        cost: Number(convertedCost.toFixed(2)),
        currency: userCurrency,
        originalCost: sub.cost,
        originalCurrency: sub.currency,
        billingFrequency: sub.billingFrequency,
        startDate: sub.startDate,
        category: sub.category?.name,
        category_color: sub.category?.color,
      };
    })
  );

  // Convert costs for upcoming renewals
  const convertedUpcomingRenewals = await Promise.all(
    upcomingRenewals.map(async (sub) => {
      const convertedCost = await convertCurrency(sub.cost, sub.currency, userCurrency);
      return {
        id: sub.id,
        name: sub.name,
        nextRenewal: sub.nextRenewal,
        cost: Number(convertedCost.toFixed(2)),
        currency: userCurrency,
        originalCost: sub.cost,
        originalCurrency: sub.currency,
        billingFrequency: sub.billingFrequency,
      };
    })
  );

  return NextResponse.json({
    totals: {
      totalMonthly: Number(totalMonthly.toFixed(2)),
      totalYearly: Number(totalYearly.toFixed(2)),
      currency: userCurrency,
      activeSubscriptions,
      upcomingRenewals: upcomingRenewals.length,
    },
    recentSubscriptions: convertedRecentSubscriptions,
    upcomingRenewals: convertedUpcomingRenewals,
  });
}
