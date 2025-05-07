import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    // Authenticate the user
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all active subscriptions for this user
    const subscriptions = await prisma.subscription.findMany({
      where: {
        userId: session.user.id,
        OR: [
          { endDate: null },
          { endDate: { gt: new Date() } }
        ]
      },
      include: { category: true }
    });

    if (subscriptions.length === 0) {
      return NextResponse.json({
        averageMonthly: { value: 0, currency: "USD" },
        averageYearly: { value: 0, currency: "USD" },
        largestExpense: null
      });
    }

    // Calculate total monthly cost
    let totalMonthly = 0;
    let defaultCurrency = "USD";

    subscriptions.forEach(sub => {
      // Use the first subscription's currency as the default
      if (!defaultCurrency && sub.currency) {
        defaultCurrency = sub.currency;
      }

      // Convert costs based on billing frequency
      if (sub.billingFrequency.toLowerCase() === "weekly") {
        totalMonthly += sub.cost * 4; // Approximately 4 weeks in a month
      } else if (sub.billingFrequency.toLowerCase() === "monthly") {
        totalMonthly += sub.cost;
      } else if (sub.billingFrequency.toLowerCase() === "yearly") {
        totalMonthly += sub.cost / 12; // Divide annual cost by 12 for monthly equivalent
      }
      // Note: One-time payments aren't included in the recurring monthly average
    });

    // Calculate total yearly cost
    let totalYearly = 0;
    subscriptions.forEach(sub => {
      if (sub.billingFrequency.toLowerCase() === "weekly") {
        totalYearly += sub.cost * 52; // 52 weeks in a year
      } else if (sub.billingFrequency.toLowerCase() === "monthly") {
        totalYearly += sub.cost * 12; // 12 months in a year
      } else if (sub.billingFrequency.toLowerCase() === "yearly") {
        totalYearly += sub.cost;
      }
      // Note: One-time payments aren't included in the recurring yearly average
    });

    // Find most expensive subscription (normalized to monthly cost for comparison)
    let largestExpense = null;
    let highestNormalizedCost = 0;

    subscriptions.forEach(sub => {
      let normalizedMonthlyCost = 0;
      
      // Convert all subscription costs to monthly for comparison
      if (sub.billingFrequency.toLowerCase() === "weekly") {
        normalizedMonthlyCost = sub.cost * 4;
      } else if (sub.billingFrequency.toLowerCase() === "monthly") {
        normalizedMonthlyCost = sub.cost;
      } else if (sub.billingFrequency.toLowerCase() === "yearly") {
        normalizedMonthlyCost = sub.cost / 12;
      } else if (sub.billingFrequency.toLowerCase() === "one-time") {
        // For one-time payments, we'll consider them as monthly for comparison purposes
        normalizedMonthlyCost = sub.cost;
      }

      if (normalizedMonthlyCost > highestNormalizedCost) {
        highestNormalizedCost = normalizedMonthlyCost;
        largestExpense = {
          id: sub.id,
          name: sub.name,
          cost: sub.cost,
          currency: sub.currency || defaultCurrency,
          billingFrequency: sub.billingFrequency,
          normalizedMonthlyCost: parseFloat(normalizedMonthlyCost.toFixed(2)),
          category: sub.category ? {
            id: sub.category.id,
            name: sub.category.name,
            color: sub.category.color
          } : null
        };
      }
    });

    // Round to 2 decimal places
    const roundedMonthly = parseFloat(totalMonthly.toFixed(2));
    const roundedYearly = parseFloat(totalYearly.toFixed(2));

    return NextResponse.json({
      averageMonthly: {
        value: roundedMonthly,
        currency: defaultCurrency
      },
      averageYearly: {
        value: roundedYearly,
        currency: defaultCurrency
      },
      largestExpense
    });
  } catch (error) {
    console.error("Error fetching analytics summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics summary" },
      { status: 500 }
    );
  }
}
