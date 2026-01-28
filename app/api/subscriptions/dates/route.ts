// api/subscriptions/dates/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { addMonths, addYears, addDays, isSameMonth, isSameYear, format } from "date-fns";

type SubscriptionWithCategory = {
  id: string;
  name: string;
  cost: number;
  currency: string;
  billingFrequency: string;
  startDate: Date;
  endDate: Date | null;
  category: { name: string; color: string } | null;
};

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  // Parse year/month from query
  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get("year"));
  const month = searchParams.get("month") ? Number(searchParams.get("month")) : undefined;

  if (!year) {
    return NextResponse.json({ error: "Missing year" }, { status: 400 });
  }

  const subscriptions = await prisma.subscription.findMany({
    where: { userId },
    include: { category: true },
  });

  // For each subscription, generate renewal dates for the requested month/year
  function getDates(sub: SubscriptionWithCategory) {
    const { billingFrequency, startDate, endDate } = sub;
    const start = new Date(startDate);
    let dates: string[] = [];

    if (billingFrequency === "monthly" && month) {
      // Find the renewal day for this month/year
      let d = new Date(start);
      while (d.getFullYear() < year || (d.getFullYear() === year && d.getMonth() < month - 1)) {
        d = addMonths(d, 1);
      }
      if (d.getFullYear() === year && d.getMonth() === month - 1) {
        dates.push(format(d, "yyyy-MM-dd"));
      }
    } else if (billingFrequency === "weekly") {
      // Find all renewal days in this month/year
      let d = new Date(start);
      while (d.getFullYear() < year || (month && (d.getFullYear() === year && d.getMonth() < month - 1))) {
        d = addDays(d, 7);
      }
      while (
        d.getFullYear() === year &&
        (!month || d.getMonth() === month - 1)
      ) {
        dates.push(format(d, "yyyy-MM-dd"));
        d = addDays(d, 7);
      }
    } else if (billingFrequency === "yearly") {
      // Only if the renewal is in this year (and month, if provided)
      let d = new Date(start);
      while (d.getFullYear() < year) {
        d = addYears(d, 1);
      }
      if (
        d.getFullYear() === year &&
        (!month || d.getMonth() === month - 1)
      ) {
        dates.push(format(d, "yyyy-MM-dd"));
      }
    }
    // Optionally filter out dates after endDate
    if (endDate) {
      const end = new Date(endDate);
      dates = dates.filter((dateStr) => new Date(dateStr) <= end);
    }
    return dates;
  }

  const result = subscriptions.map((sub: SubscriptionWithCategory) => ({
    id: sub.id,
    name: sub.name,
    billingFrequency: sub.billingFrequency,
    cost: sub.cost,
    currency: sub.currency,
    category: sub.category?.name,
    category_color: sub.category?.color,
    sub_dates: getDates(sub),
  }));
  return NextResponse.json({ overview: result });
}
