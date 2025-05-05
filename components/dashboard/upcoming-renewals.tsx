"use client"

import { format } from "date-fns"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"

// Mock data - would be replaced with actual data from your API
const upcomingRenewals = [
  {
    id: "1",
    name: "Netflix",
    cost: 15.99,
    nextBillingDate: new Date(2025, 4, 15),
    logo: "N",
  },
  {
    id: "3",
    name: "Adobe Creative Cloud",
    cost: 52.99,
    nextBillingDate: new Date(2025, 4, 10),
    logo: "A",
  },
  {
    id: "2",
    name: "Spotify",
    cost: 9.99,
    nextBillingDate: new Date(2025, 4, 20),
    logo: "S",
  },
]

export function UpcomingRenewals() {
  // Sort by next billing date (ascending)
  const sortedRenewals = [...upcomingRenewals].sort((a, b) => a.nextBillingDate.getTime() - b.nextBillingDate.getTime())

  return (
    <div className="space-y-4">
      {sortedRenewals.map((renewal) => (
        <Card key={renewal.id}>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-9 w-9">
                <AvatarFallback>{renewal.logo}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-none">{renewal.name}</p>
                <p className="text-sm text-muted-foreground">{format(renewal.nextBillingDate, "MMM d, yyyy")}</p>
              </div>
              <div className="font-medium">${renewal.cost.toFixed(2)}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
