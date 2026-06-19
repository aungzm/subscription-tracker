import { Suspense } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SubscriptionsList } from "@/components/subscriptions/subscriptions-list"
import { SubscriptionsTableSkeleton } from "@/components/subscriptions/subscriptions-table-skeleton"
import { FileUp, Plus } from "lucide-react"

export default function SubscriptionsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Subscriptions</h2>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/subscriptions/import">
              <FileUp className="mr-2 h-4 w-4" />
              Import CSV
            </Link>
          </Button>
          <Button asChild>
            <Link href="/subscriptions/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Subscription
            </Link>
          </Button>
        </div>
      </div>
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="yearly">Yearly</TabsTrigger>
          <TabsTrigger value="other">Other</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Subscriptions</CardTitle>
              <CardDescription>Manage all your active subscriptions</CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<SubscriptionsTableSkeleton />}>
                <SubscriptionsList />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="monthly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Subscriptions</CardTitle>
              <CardDescription>Manage your monthly subscriptions</CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<SubscriptionsTableSkeleton />}>
                <SubscriptionsList billingFrequency="monthly" />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="yearly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Yearly Subscriptions</CardTitle>
              <CardDescription>Manage your yearly subscriptions</CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<SubscriptionsTableSkeleton />}>
                <SubscriptionsList billingFrequency="yearly" />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="other" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Other Subscriptions</CardTitle>
              <CardDescription>Manage your weekly and custom subscriptions</CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<SubscriptionsTableSkeleton />}>
                <SubscriptionsList billingFrequency="other" />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
