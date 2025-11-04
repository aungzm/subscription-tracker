import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { convertCurrency } from "@/lib/currency";

interface Subscription {
  id: string;
  cost: number;
  currency: string;
  billingFrequency: string;
  startDate: Date;
  endDate: Date | null;
  category: {
    id: string;
    name: string;
    color: string;
    createdAt: Date;
    updatedAt: Date;
  } | null;
}

export type YearlyDataPoint = {
  year: number;
  total: number;
  [key: string]: string | number;
};

export async function GET(request: NextRequest) {
  try {
    // Authenticate the user
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's preferred currency
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { currency: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userCurrency = user.currency;

    // Get all subscriptions for this user
    const subscriptions = await prisma.subscription.findMany({
      where: {
        userId: session.user.id,
      },
      include: { category: true },
    });

    // Get all years from subscriptions
    const years = subscriptions.flatMap((sub) => {
      const startYear = new Date(sub.startDate).getFullYear();
      const currentYear = new Date().getFullYear();
      const endYear = sub.endDate 
        ? Math.min(new Date(sub.endDate).getFullYear(), currentYear)
        : currentYear;
      
      // Generate array of years from start to end
      const yearRange = [];
      for (let year = startYear; year <= endYear; year++) {
        yearRange.push(year);
      }
      return yearRange;
    });

    // Get unique years and sort them
    const uniqueYears = Array.from(new Set(years)).sort((a, b) => a - b);

    // Initialize yearly data structure - one object per year
    let yearlyData: YearlyDataPoint[] = uniqueYears.map(year => ({
      year,
      total: 0,
    }));

    // Track categories we encounter
    const categoryMeta: Record<
      string,
      { id: string; name: string; color: string }
    > = {};

    // Process each subscription with currency conversion
    for (const sub of subscriptions) {
      const startYear = new Date(sub.startDate).getFullYear();
      const currentYear = new Date().getFullYear();
      const endYear = sub.endDate
        ? Math.min(new Date(sub.endDate).getFullYear(), currentYear)
        : currentYear;

      // Convert cost to user's preferred currency first
      const convertedCost = await convertCurrency(sub.cost, sub.currency, userCurrency);

      // Calculate yearly cost based on billing frequency (using converted cost)
      let yearlyCost: number;
      switch (sub.billingFrequency.toLowerCase()) {
        case "weekly":
          yearlyCost = convertedCost * 52; // 52 weeks in a year
          break;
        case "monthly":
          yearlyCost = convertedCost * 12; // 12 months in a year
          break;
        case "yearly":
        case "one-time": // One-time costs are counted in full
          yearlyCost = convertedCost;
          break;
        default:
          yearlyCost = convertedCost; // Default case
      }

      // Determine category
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
            color: "#999999", // Default color for uncategorized
          };
        }
      }

      // For one-time payments, only add to the start year
      if (sub.billingFrequency.toLowerCase() === "one-time") {
        const yearIndex = yearlyData.findIndex(item => item.year === startYear);
        if (yearIndex !== -1) {
          // Initialize category key if it doesn't exist
          if (yearlyData[yearIndex][categoryKey] === undefined) {
            yearlyData[yearIndex][categoryKey] = 0;
          }
          // Add cost to category and total
          yearlyData[yearIndex][categoryKey] = 
            (yearlyData[yearIndex][categoryKey] as number) + yearlyCost;
          yearlyData[yearIndex].total = 
            (yearlyData[yearIndex].total as number) + yearlyCost;
        }
      } else {
        // For recurring payments, add to each year in the range
        for (let year = startYear; year <= endYear; year++) {
          const yearIndex = yearlyData.findIndex(item => item.year === year);
          if (yearIndex !== -1) {
            // Calculate prorated cost for partial years
            let effectiveYearlyCost = yearlyCost;

            // Prorate for first year if subscription didn't start on Jan 1
            if (year === startYear) {
              const startDate = new Date(sub.startDate);
              const monthsActive = 12 - startDate.getMonth();
              if (sub.billingFrequency.toLowerCase() === "monthly") {
                effectiveYearlyCost = convertedCost * monthsActive;
              } else if (sub.billingFrequency.toLowerCase() === "weekly") {
                // Approximately 4.33 weeks per month
                effectiveYearlyCost = convertedCost * monthsActive * 4.33;
              } else if (sub.billingFrequency.toLowerCase() === "yearly") {
                // Prorate yearly subscriptions based on months active
                effectiveYearlyCost = (convertedCost * monthsActive) / 12;
              }
            }

            // Prorate for last year if subscription ends before Dec 31
            if (year === endYear && sub.endDate) {
              const endDate = new Date(sub.endDate);
              // +1 because getMonth() is 0-indexed
              const monthsActive = endDate.getMonth() + 1;
              if (sub.billingFrequency.toLowerCase() === "monthly") {
                effectiveYearlyCost = convertedCost * monthsActive;
              } else if (sub.billingFrequency.toLowerCase() === "weekly") {
                effectiveYearlyCost = convertedCost * monthsActive * 4.33;
              } else if (sub.billingFrequency.toLowerCase() === "yearly") {
                effectiveYearlyCost = (convertedCost * monthsActive) / 12;
              }
            }

            // Initialize category key if it doesn't exist
            if (yearlyData[yearIndex][categoryKey] === undefined) {
              yearlyData[yearIndex][categoryKey] = 0;
            }
            // Add cost to category and total
            yearlyData[yearIndex][categoryKey] = 
              (yearlyData[yearIndex][categoryKey] as number) + effectiveYearlyCost;
            yearlyData[yearIndex].total = 
              (yearlyData[yearIndex].total as number) + effectiveYearlyCost;
          }
        }
      }
    });

    // Round off numbers for cleaner display
    yearlyData = yearlyData.map(yearData => {
      const rounded: YearlyDataPoint = { year: yearData.year, total: 0 };
      // Round the total
      rounded.total = Math.round(yearData.total as number);
      // Round each category
      Object.keys(yearData).forEach(key => {
        if (key !== "year" && key !== "total") {
          rounded[key] = Math.round(yearData[key] as number);
        }
      });
      return rounded;
    });

    return NextResponse.json({
      yearlyData,
      categories: Object.values(categoryMeta),
      currency: userCurrency,
    });
  } catch (error) {
    console.error("Error fetching yearly analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics data" },
      { status: 500 }
    );
  }
}
