import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SubscriptionForm } from "@/components/subscriptions/subscription-form"
import { ArrowLeft } from "lucide-react"

export default function NewSubscriptionPage() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center">
        <Link href="/dashboard/subscriptions">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
        <div className="ml-4">
          <h2 className="text-3xl font-bold tracking-tight">Add Subscription</h2>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Subscription Details</CardTitle>
          <CardDescription>Enter the details of your subscription</CardDescription>
        </CardHeader>
        <CardContent>
          <SubscriptionForm />
        </CardContent>
      </Card>
    </div>
  )
}
