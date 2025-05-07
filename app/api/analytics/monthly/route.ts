import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

interface Subscription {
  id: string;
  userId: string;
  cost: number;
  billingFrequency: string; 
  startDate: Date;
  endDate: Date | null;
  category: {
    id: string;
    name: string;
    color: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
  } | null;
}

export type MonthlyDataPoint = {
  name: string;
  total: number;
  [key: string]: string | number;
};

export async function GET(request: NextRequest) {
  try {
    // Authenticate the user.
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the year parameter from the query string (defaults to current year).
    const searchParams = request.nextUrl.searchParams;
    const yearParam =
      searchParams.get("year") || new Date().getFullYear().toString();
    if (isNaN(parseInt(yearParam))) {
      return NextResponse.json(
        { error: "Invalid year parameter" },
        { status: 400 }
      );
    }
    const yearInt = parseInt(yearParam);

    // Define the boundaries for the year.
    const startOfYear = new Date(yearInt, 0, 1);
    // End of December: 23:59:59 on Dec 31.
    const endOfYear = new Date(yearInt, 11, 31, 23, 59, 59);
    const subscriptions = await prisma.subscription.findMany({
      where: {
        userId: session.user.id,
        startDate: { lte: endOfYear },
        OR: [{ endDate: { gte: startOfYear } }, { endDate: null }],
      },
      include: { category: true },
    });

    // Initialize monthly data – one object per month.
    let monthlyData: MonthlyDataPoint[] = Array.from({ length: 12 }, (_, i) => ({
      name: new Date(yearInt, i).toLocaleString("default", { month: "short" }),
      total: 0,
    }));

    const categoryMeta: Record<
      string,
      { id: string; name: string; color: string }
    > = {};


    const getEffectiveRange = (
      subStart: Date,
      subEnd: Date | null
    ): { effectiveStart: Date; effectiveEnd: Date } => {
      const effectiveStart = subStart < startOfYear ? startOfYear : subStart;
      const effectiveEnd = !subEnd || subEnd > endOfYear ? endOfYear : subEnd;
      return { effectiveStart, effectiveEnd };
    };

    subscriptions.forEach((sub) => {
      const subStart = new Date(sub.startDate);
      const subEnd = sub.endDate ? new Date(sub.endDate) : null;
      const { effectiveStart, effectiveEnd } = getEffectiveRange(
        subStart,
        subEnd
      );

      const startMonth = effectiveStart.getMonth();
      const endMonth = effectiveEnd.getMonth();
      // - For monthly and yearly subscriptions, use cost as is.
      // - For weekly subscriptions, multiply cost by 4.
      let monthlyCost = sub.cost;
      if (sub.billingFrequency === "weekly") {
        monthlyCost = sub.cost * 4;
      }
      // Determine the group key for the category. If none is provided, use "uncategorized".
      let categoryKey = "uncategorized";
      if (sub.category) {
        categoryKey = sub.category.id;
        if (!categoryMeta[categoryKey]) {
          categoryMeta[categoryKey] = {
            id: sub.category.id,
            name: sub.category.name,
            color: sub.category.color,
          };
        }
      } else {
        if (!categoryMeta["uncategorized"]) {
          categoryMeta["uncategorized"] = {
            id: "uncategorized",
            name: "Uncategorized",
            color: "#999999", // A default color for uncategorized items
          };
        }
      }

      // Distribute the monthlyCost to every month in the effective period.
      for (let m = startMonth; m <= endMonth; m++) {
        // Initialize the key if it doesn't exist yet.
        if (monthlyData[m][categoryKey] === undefined) {
          monthlyData[m][categoryKey] = 0;
        }
        monthlyData[m][categoryKey] =
          (monthlyData[m][categoryKey] as number) + monthlyCost;
        monthlyData[m].total = (monthlyData[m].total as number) + monthlyCost;
      }
    });

    // Round off numbers for cleaner display.
    monthlyData = monthlyData.map((month) => {
      const rounded: MonthlyDataPoint = { name: month.name, total: 0 };
      // Round the total.
      rounded.total = Math.round(month.total as number);
      // For every dynamic category key.
      Object.keys(month).forEach((key) => {
        if (key !== "name" && key !== "total") {
          rounded[key] = Math.round(month[key] as number);
        }
      });
      return rounded;
    });

    const availableYears = await prisma.subscription.findMany({
      where: { userId: session.user.id },
        select: {
            startDate: true,
            endDate: true,
        },
    });
    const years = availableYears.map((sub) => {
        const startYear = new Date(sub.startDate).getFullYear();
        const endYear = sub.endDate ? new Date(sub.endDate).getFullYear() : null;
        return endYear ? [startYear, endYear] : [startYear];
        }
    ).flat();
    const uniqueYears = Array.from(new Set(years)).sort((a, b) => a - b);   

    return NextResponse.json({
      years: uniqueYears,
      monthlyData,
      categories: Object.values(categoryMeta),
    });
  } catch (error) {
    console.error("Error fetching monthly analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics data" },
      { status: 500 }
    );
  }
}
