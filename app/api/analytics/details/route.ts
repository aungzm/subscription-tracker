import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { normalizeToMonthlyCost, convertCurrency } from "@/lib/currency";

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
        averageMonthly: { value: 0, currency: userCurrency },
        averageYearly: { value: 0, currency: userCurrency },
        largestExpense: null
      });
    }

    // Calculate total monthly cost with currency conversion
    let totalMonthly = 0;
    for (const sub of subscriptions) {
      const monthlyCost = await normalizeToMonthlyCost(
        sub.cost,
        sub.currency,
        sub.billingFrequency,
        userCurrency
      );
      totalMonthly += monthlyCost;
    }

    // Calculate total yearly cost
    let totalYearly = totalMonthly * 12;

    // Find most expensive subscription (normalized to monthly cost for comparison)
    let largestExpense = null;
    let highestNormalizedCost = 0;

    for (const sub of subscriptions) {
      // Convert to monthly cost in user's currency
      const normalizedMonthlyCost = await normalizeToMonthlyCost(
        sub.cost,
        sub.currency,
        sub.billingFrequency,
        userCurrency
      );

      if (normalizedMonthlyCost > highestNormalizedCost) {
        highestNormalizedCost = normalizedMonthlyCost;
        // Also convert the original cost to user's currency for display
        const convertedCost = await convertCurrency(sub.cost, sub.currency, userCurrency);
        largestExpense = {
          id: sub.id,
          name: sub.name,
          cost: parseFloat(convertedCost.toFixed(2)),
          originalCost: sub.cost,
          originalCurrency: sub.currency,
          currency: userCurrency,
          billingFrequency: sub.billingFrequency,
          normalizedMonthlyCost: parseFloat(normalizedMonthlyCost.toFixed(2)),
          category: sub.category ? {
            id: sub.category.id,
            name: sub.category.name,
            color: sub.category.color
          } : null
        };
      }
    }

    // Round to 2 decimal places
    const roundedMonthly = parseFloat(totalMonthly.toFixed(2));
    const roundedYearly = parseFloat(totalYearly.toFixed(2));

    return NextResponse.json({
      averageMonthly: {
        value: roundedMonthly,
        currency: userCurrency
      },
      averageYearly: {
        value: roundedYearly,
        currency: userCurrency
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
