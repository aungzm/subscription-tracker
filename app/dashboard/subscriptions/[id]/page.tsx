"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { SubscriptionForm } from "@/components/subscriptions/subscription-form"
import { toast } from "@/components/ui/use-toast"

export default function EditSubscriptionPage() {
  const { id } = useParams()
  const router = useRouter()
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSubscription() {
      try {
        const res = await fetch(`/api/subscriptions/${id}`)
        console.log(res);
        if (!res.ok) throw new Error("Failed to fetch subscription")
        const data = await res.json()
        setSubscription(data)
        console.log(data);
      } catch (error) {
        toast({
          title: "Error",
          description: "Unable to load subscription.",
          variant: "destructive",
        })
        router.push("/dashboard/subscriptions")
      } finally {
        setLoading(false)
      }
    }
    fetchSubscription()
  }, [id, router])

  if (loading) return <div>Loading...</div>
  if (!subscription) return null

return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
        <div className="flex items-center">
            <button
                type="button"
                onClick={() => router.push("/dashboard/subscriptions")}
                className="gap-1 flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
                {/* You can use an icon library here, e.g., lucide-react */}
                <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Back
            </button>
        </div>
        <div className="bg-card rounded-lg shadow-sm border mt-4">
            <div className="p-6 border-b">
                <h3 className="text-lg font-semibold">Subscription Details</h3>
                <p className="text-sm text-muted-foreground">Update the details of your subscription</p>
            </div>
            <div className="p-6">
                <SubscriptionForm
                    mode="edit"
                    initialValues={subscription}
                    subscriptionId={Array.isArray(id) ? id[0] : id}
                />
            </div>
        </div>
    </div>
)
}
