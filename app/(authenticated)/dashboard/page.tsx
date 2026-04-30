import { Suspense } from "react";
import { Activity, CalendarClock, CreditCard, Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Overview } from "@/components/dashboard/overview";
import { RecentSubscriptions } from "@/components/dashboard/recent-subscriptions";
import { UpcomingRenewals } from "@/components/dashboard/upcoming-renewals";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { cookies, headers } from "next/headers";

export const dynamic = "force-dynamic";

// Types
interface RecentSubscription {
  id: string;
  name: string;
  cost: number;
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
  billingFrequency: string;
}

interface DashboardData {
  totals: {
    totalMonthly: number;
    totalYearly: number;
    activeSubscriptions: number;
    upcomingRenewals: number;
  };
  recentSubscriptions: RecentSubscription[];
  upcomingRenewals: UpcomingRenewal[];
}

async function getDashboardData(): Promise<DashboardData> {
  const cookieStore = await cookies();
  const cookie = cookieStore.toString();

  const host = (await headers()).get("host");
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
  const url = `${protocol}://${host}/api/subscriptions/details`;

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
      value: `$${data.totals.totalMonthly.toFixed(2)}`,
      note: "Recurring monthly baseline",
      icon: Wallet,
    },
    {
      title: "Yearly spend",
      value: `$${data.totals.totalYearly.toFixed(2)}`,
      note: "Projected annual cost",
      icon: Activity,
    },
    {
      title: "Active subscriptions",
      value: String(data.totals.activeSubscriptions),
      note: "Currently billing",
      icon: CreditCard,
    },
    {
      title: "Upcoming renewals",
      value: String(data.totals.upcomingRenewals),
      note: "Next 7 days",
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
