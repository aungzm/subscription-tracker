import { Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Overview } from "@/components/dashboard/overview"
import { RecentSubscriptions } from "@/components/dashboard/recent-subscriptions"
import { UpcomingRenewals } from "@/components/dashboard/upcoming-renewals"
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton"

export default function DashboardPage() {
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
              <div className="text-2xl font-bold">$249.45</div>
              <p className="text-xs text-muted-foreground">+2.5% from last month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Yearly</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$2,993.40</div>
              <p className="text-xs text-muted-foreground">+18.1% from last year</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">+2 from last year</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Renewals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
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
              <UpcomingRenewals />
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
              <RecentSubscriptions />
            </CardContent>
          </Card>
        </div>
      </Suspense>
    </div>
  )
}
