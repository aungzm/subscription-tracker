import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const session = await auth()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    // Get current date for calculations
    const now = new Date()
    const sevenDaysLater = new Date(now)
    sevenDaysLater.setDate(now.getDate() + 7)

    // Get monthly total
    const monthlySubscriptions = await prisma.subscription.findMany({
      where: {
        userId,
        billingFrequency: "monthly",
      },
      select: {
        cost: true,
      },
    })
    
    const monthlyTotal = monthlySubscriptions.reduce(
      (sum, sub) => sum + sub.cost,
      0
    )

    // Get yearly total
    const yearlyTotal = monthlyTotal * 12 + ((await prisma.subscription.aggregate({
      where: {
        userId,
        billingFrequency: "yearly",
      },
      _sum: {
        cost: true,
      },
    }))?._sum?.cost ?? 0)

    // Active subscriptions count
    const activeSubscriptionsCount = await prisma.subscription.count({
      where: {
        userId,
      },
    })

    // Upcoming renewals
    const upcomingRenewals = await prisma.subscription.findMany({
      where: {
        userId,
        nextBillingDate: {
          gte: now,
          lte: sevenDaysLater,
        },
      },
      include: {
        category: true,
      },
      orderBy: {
        nextBillingDate: "asc",
      },
    })

    // Category spending breakdown with percentages
    // First get all subscriptions with their categories
    const subscriptions = await prisma.subscription.findMany({
      where: {
        userId,
      },
      include: {
        category: true,
      },
    })
    
    // Calculate yearly amount for each subscription
    const subsWithYearlyAmount = subscriptions.map(sub => {
      let yearlyAmount = 0;
      switch (sub.billingFrequency) {
        case 'monthly':
          yearlyAmount = sub.cost * 12;
          break;
        case 'yearly':
          yearlyAmount = sub.cost;
          break;
        case 'weekly':
          yearlyAmount = sub.cost * 52;
          break;
        default:
          yearlyAmount = sub.cost;
      }
      return {
        ...sub,
        yearlyAmount
      };
    });
    
    // Group by category and calculate sums
    const categoryMap = new Map();
    
    subsWithYearlyAmount.forEach(sub => {
      const categoryName = sub.category?.name || "Uncategorized";
      const categoryColor = sub.category?.color || "#888888";
      
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, {
          name: categoryName,
          color: categoryColor,
          amount: 0
        });
      }
      
      const category = categoryMap.get(categoryName);
      category.amount += sub.yearlyAmount;
    });
    
    // Convert to array and calculate percentages
    const categorySpending = Array.from(categoryMap.values()).map(category => ({
      ...category,
      percentage: Number(((category.amount / yearlyTotal) * 100).toFixed(1))
    }));
    
    // Sort by amount descending
    categorySpending.sort((a, b) => b.amount - a.amount);

    // Monthly spending history
    const monthlySpendingHistory = await prisma.$queryRaw`
      SELECT strftime('%Y-%m', nextBillingDate) as month, SUM(cost) as total
      FROM Subscription
      WHERE userId = ${userId}
      GROUP BY month
      ORDER BY month
    `

    return NextResponse.json({
      monthlyTotal,
      yearlyTotal,
      activeSubscriptionsCount,
      upcomingRenewalsCount: upcomingRenewals.length,
      upcomingRenewals,
      monthlySpendingHistory,
      categorySpending: {
        breakdown: categorySpending,
        totalYearlySpend: yearlyTotal
      }
    })
  } catch (error) {
    console.error("Error fetching analytics:", error)
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    )
  }
}
