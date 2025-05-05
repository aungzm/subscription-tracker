"use client"

import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// Mock data - would be replaced with actual data from your API
const recentSubscriptions = [
  {
    id: "1",
    name: "Netflix",
    cost: 15.99,
    billingFrequency: "monthly",
    startDate: new Date(2025, 3, 15),
    category: "entertainment",
  },
  {
    id: "2",
    name: "Spotify",
    cost: 9.99,
    billingFrequency: "monthly",
    startDate: new Date(2025, 3, 10),
    category: "entertainment",
  },
  {
    id: "3",
    name: "Adobe Creative Cloud",
    cost: 52.99,
    billingFrequency: "monthly",
    startDate: new Date(2025, 3, 5),
    category: "productivity",
  },
  {
    id: "4",
    name: "Amazon Prime",
    cost: 139,
    billingFrequency: "yearly",
    startDate: new Date(2025, 3, 1),
    category: "shopping",
  },
]

export function RecentSubscriptions() {
  // Sort by start date (descending)
  const sortedSubscriptions = [...recentSubscriptions].sort((a, b) => b.startDate.getTime() - a.startDate.getTime())

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case "entertainment":
        return "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300"
      case "productivity":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case "utilities":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      case "health":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "education":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
      case "shopping":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Cost</TableHead>
          <TableHead>Billing</TableHead>
          <TableHead>Start Date</TableHead>
          <TableHead>Category</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedSubscriptions.map((subscription) => (
          <TableRow key={subscription.id}>
            <TableCell className="font-medium">{subscription.name}</TableCell>
            <TableCell>${subscription.cost.toFixed(2)}</TableCell>
            <TableCell className="capitalize">{subscription.billingFrequency}</TableCell>
            <TableCell>{format(subscription.startDate, "MMM d, yyyy")}</TableCell>
            <TableCell>
              <Badge className={getCategoryBadgeColor(subscription.category)} variant="outline">
                {subscription.category}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
