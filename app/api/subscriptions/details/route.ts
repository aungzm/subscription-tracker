// api/subscriptions/details/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db"; // Adjust import as needed
import { addDays, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
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

  // Totals
  let totalMonthly = 0;
  let totalYearly = 0;
  let activeSubscriptions = 0;

  subscriptions.forEach((sub) => {
    if (!sub.endDate || new Date(sub.endDate) > today) {
      activeSubscriptions += 1;
      if (sub.billingFrequency === "monthly") {
        totalMonthly += sub.cost;
        totalYearly += sub.cost * 12;
      } else if (sub.billingFrequency === "yearly") {
        totalYearly += sub.cost;
      } else if (sub.billingFrequency === "weekly") {
        totalMonthly += sub.cost * 4; // Approximate monthly cost
        totalYearly += sub.cost * 52; // Approximate yearly cost
      } // Add other billing frequencies as needed
    }
  });

  return NextResponse.json({
    totals: {
      totalMonthly: Number(totalMonthly.toFixed(2)),
      totalYearly: Number(totalYearly.toFixed(2)),
      activeSubscriptions,
      upcomingRenewals: upcomingRenewals.length,
    },
    recentSubscriptions: recentSubscriptions.map((sub) => ({
      id: sub.id,
      name: sub.name,
      cost: sub.cost,
      billingFrequency: sub.billingFrequency,
      startDate: sub.startDate,
      category: sub.category?.name,
      category_color: sub.category?.color,
    })),
    upcomingRenewals: upcomingRenewals.map((sub) => ({
      id: sub.id,
      name: sub.name,
      nextRenewal: sub.nextRenewal,
      cost: sub.cost,
      billingFrequency: sub.billingFrequency,
    })),
  });
}
