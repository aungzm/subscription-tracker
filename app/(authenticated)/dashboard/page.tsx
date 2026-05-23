import { Suspense } from "react";
import { Activity, CalendarClock, CreditCard, Minus, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Overview } from "@/components/dashboard/overview";
import { RecentSubscriptions } from "@/components/dashboard/recent-subscriptions";
import { UpcomingRenewals } from "@/components/dashboard/upcoming-renewals";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { getInternalAppOrigin } from "@/lib/app-url";
import { formatCurrency } from "@/lib/currency";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

// Types
interface RecentSubscription {
  id: string;
  name: string;
  cost: number;
  currency: string;
  billingFrequency: string;
  startDate: string; // Use string for JSON dates
  category: string;
  category_color: string;
}

interface UpcomingRenewal {
  id: string;
  name: string;
  nextRenewal: string; // Use string for JSON dates
  cost: number;
  currency: string;
  billingFrequency: string;
}

interface DashboardData {
  totals: {
    totalMonthly: number;
    totalYearly: number;
    currency: string;
    activeSubscriptions: number;
    upcomingRenewals: number;
    trends: {
      totalMonthly: TrendMetric;
      totalYearly: TrendMetric;
      activeSubscriptions: TrendMetric;
      upcomingRenewals: TrendMetric;
    };
  };
  recentSubscriptions: RecentSubscription[];
  upcomingRenewals: UpcomingRenewal[];
}

interface TrendMetric {
  delta: number;
  percentageChange: number | null;
  comparisonLabel: string;
}

function formatTrend(metric: TrendMetric, deltaFormatter?: (value: number) => string) {
  if (metric.delta === 0) {
    return {
      icon: Minus,
      className: "text-muted-foreground",
      text: `No change ${metric.comparisonLabel}`,
    };
  }

  const isPositive = metric.delta > 0;
  const icon = isPositive ? TrendingUp : TrendingDown;
  const className = isPositive ? "text-primary" : "text-foreground";
  const deltaText =
    metric.percentageChange === null
      ? `${isPositive ? "+" : ""}${deltaFormatter ? deltaFormatter(Math.abs(metric.delta)) : Math.abs(metric.delta).toFixed(2)}`
      : `${isPositive ? "+" : ""}${metric.percentageChange.toFixed(1)}%`;

  return {
    icon,
    className,
    text: `${deltaText} ${metric.comparisonLabel}`,
  };
}

async function getDashboardData(): Promise<DashboardData> {
  const cookieStore = await cookies();
  const cookie = cookieStore.toString();

  const url = `${getInternalAppOrigin()}/api/subscriptions/details`;

  const res = await fetch(url, {
    headers: { cookie },
    next: { revalidate: 180, tags: ["dashboard"] },
  });
  if (!res.ok) throw new Error("Failed to fetch dashboard data");
  return res.json();
}

export default async function DashboardPage() {
  const data = await getDashboardData();
  const statCards = [
    {
      title: "Monthly spend",
      value: formatCurrency(data.totals.totalMonthly, data.totals.currency),
      note: "Estimated cost based on active monthly billing",
      trend: formatTrend(data.totals.trends.totalMonthly, (value) =>
        formatCurrency(value, data.totals.currency)
      ),
      icon: Wallet,
    },
    {
      title: "Yearly spend",
      value: formatCurrency(data.totals.totalYearly, data.totals.currency),
      note: "Estimated annualized cost across active subscriptions",
      trend: formatTrend(data.totals.trends.totalYearly, (value) =>
        formatCurrency(value, data.totals.currency)
      ),
      icon: Activity,
    },
    {
      title: "Active subscriptions",
      value: String(data.totals.activeSubscriptions),
      note: "Subscriptions currently marked active",
      trend: formatTrend(data.totals.trends.activeSubscriptions, (value) => String(Math.round(value))),
      icon: CreditCard,
    },
    {
      title: "Upcoming renewals",
      value: String(data.totals.upcomingRenewals),
      note: "Renewals scheduled within the next 7 days",
      trend: formatTrend(data.totals.trends.upcomingRenewals, (value) => String(Math.round(value))),
      icon: CalendarClock,
    },
  ];

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6 lg:p-8">
      <div className="space-y-1">
        <h2 className="font-heading text-3xl font-semibold tracking-tight">Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          A quick view of your active services, renewal timing, and recent additions.
        </p>
      </div>
      <Suspense fallback={<DashboardSkeleton />}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statCards.map((stat) => (
            <Card key={stat.title} className="bg-card/80 backdrop-blur">
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardDescription>{stat.title}</CardDescription>
                  <CardTitle className="mt-2 text-3xl">{stat.value}</CardTitle>
                </div>
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/12 text-primary">
                  <stat.icon className="size-4" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground">{stat.note}</p>
                <div className={`mt-3 flex items-center gap-1.5 text-xs ${stat.trend.className}`}>
                  <stat.trend.icon className="size-3.5" />
                  <span>{stat.trend.text}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.85fr)]">
          <Card className="bg-card/80">
            <CardHeader className="border-b border-border/50">
              <CardTitle>Overview</CardTitle>
              <CardDescription>
                Browse subscription activity by date and inspect what renews when.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <Overview />
            </CardContent>
          </Card>
          <Card className="bg-card/80">
            <CardHeader className="border-b border-border/50">
              <CardTitle>Upcoming Renewals</CardTitle>
              <CardDescription>Services billing in the near term</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <UpcomingRenewals renewals={data.upcomingRenewals} />
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-4">
          <Card className="bg-card/80">
            <CardHeader className="border-b border-border/50">
              <CardTitle>Recent Subscriptions</CardTitle>
              <CardDescription>Newest subscriptions added to your workspace</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <RecentSubscriptions subscriptions={data.recentSubscriptions} />
            </CardContent>
          </Card>
        </div>
      </Suspense>
    </div>
  );
}
