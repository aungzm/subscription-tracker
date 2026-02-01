import { Suspense } from "react";
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

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>
      <Suspense fallback={<DashboardSkeleton />}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Monthly</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${data.totals.totalMonthly.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">+2.5% from last month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Yearly</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${data.totals.totalYearly.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">+18.1% from last year</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.totals.activeSubscriptions}</div>
              <p className="text-xs text-muted-foreground">+2 from last year</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Renewals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.totals.upcomingRenewals}</div>
              <p className="text-xs text-muted-foreground">In the next 7 days</p>
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Overview</CardTitle>
              <CardDescription>Your subscription spending over time</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <Overview />
            </CardContent>
          </Card>
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Upcoming Renewals</CardTitle>
              <CardDescription>Subscriptions renewing soon</CardDescription>
            </CardHeader>
            <CardContent>
              <UpcomingRenewals renewals={data.upcomingRenewals} />
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-4">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Recent Subscriptions</CardTitle>
              <CardDescription>Your recently added subscriptions</CardDescription>
            </CardHeader>
            <CardContent>
              <RecentSubscriptions subscriptions={data.recentSubscriptions} />
            </CardContent>
          </Card>
        </div>
      </Suspense>
    </div>
  );
}
