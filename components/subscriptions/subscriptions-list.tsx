"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  format,
  setMonth,
  setYear,
  isAfter,
  addMonths,
  addYears,
} from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"
import { Edit, MoreHorizontal, Trash } from "lucide-react"

interface Subscription {
  startDate: string | Date
  id: string
  name: string
  cost: number
  billingFrequency: string
  category: { id: string; name: string; color?: string } | null
  paymentMethod: { id: string; name: string } | null
}

type SubscriptionsListProps = {
  billingFrequency?: string
}

function getNextBillingDate(startDate: Date, billingFrequency: string): string {
  const now = new Date()
  if (billingFrequency === "monthly") {
    let next = setMonth(new Date(now), now.getMonth())
    next.setDate(startDate.getDate())
    if (isAfter(now, next)) {
      next = addMonths(next, 1)
    }
    return format(next, "MMM d")
  }
  if (billingFrequency === "yearly") {
    let next = setYear(
      setMonth(new Date(now), new Date(startDate).getMonth()),
      now.getFullYear()
    )
    next.setDate(new Date(startDate).getDate())
    if (isAfter(now, next)) {
      next = addYears(next, 1)
    }
    return format(next, "MMM d")
  }
  return format(new Date(startDate), "MMM d, yyyy")
}

export function SubscriptionsList({ billingFrequency }: SubscriptionsListProps) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [selectedSubscriptions, setSelectedSubscriptions] = useState<string[]>(
    []
  )
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    async function fetchSubscriptions() {
      try {
        const res = await fetch("/api/subscriptions")
        if (!res.ok) throw new Error("Failed to fetch")
        const data: Subscription[] = await res.json()
        setSubscriptions(data)
      } catch (error) {
        console.error(error)
        toast({
          title: "Error",
          description: "Unable to load subscriptions.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
    fetchSubscriptions()
  }, [])

  // Filter subscriptions based on billingFrequency prop
  const filteredSubscriptions = billingFrequency
    ? subscriptions.filter((sub) => {
        if (billingFrequency === "other") {
          return (
            sub.billingFrequency !== "monthly" &&
            sub.billingFrequency !== "yearly"
          )
        }
        return sub.billingFrequency === billingFrequency
      })
    : subscriptions

  const handleSelectAll = () => {
    if (selectedSubscriptions.length === filteredSubscriptions.length) {
      setSelectedSubscriptions([])
    } else {
      setSelectedSubscriptions(filteredSubscriptions.map((sub) => sub.id))
    }
  }

  const handleSelectOne = (id: string) => {
    if (selectedSubscriptions.includes(id)) {
      setSelectedSubscriptions((prev) => prev.filter((subId) => subId !== id))
    } else {
      setSelectedSubscriptions((prev) => [...prev, id])
    }
  }

  const handleDelete = (id: string) => {
    setDeleting(true)
    fetch(`/api/subscriptions/${id}`, {
      method: "DELETE",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to delete")
        setSubscriptions((prev) => prev.filter((sub) => sub.id !== id))
        setSelectedSubscriptions((prev) => prev.filter((subId) => subId !== id))
        toast({
          title: "Subscription deleted",
          description: "The subscription has been deleted successfully.",
        })
      })
      .catch((error) => {
        console.error(error)
        toast({
          title: "Error",
          description: "Unable to delete subscription.",
          variant: "destructive",
        })
      })
      .finally(() => {
        setDeleting(false)
      })
  }

  // GROUP DELETE
  const handleGroupDelete = async () => {
    if (
      selectedSubscriptions.length === 0 ||
      !window.confirm(
        `Delete ${selectedSubscriptions.length} selected subscription(s)?`
      )
    )
      return

    setDeleting(true)
    try {
      await Promise.all(
        selectedSubscriptions.map((id) =>
          fetch(`/api/subscriptions/${id}`, { method: "DELETE" })
        )
      )
      setSubscriptions((prev) =>
        prev.filter((sub) => !selectedSubscriptions.includes(sub.id))
      )
      setSelectedSubscriptions([])
      toast({
        title: "Deleted",
        description: "Selected subscriptions have been deleted.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Unable to delete selected subscriptions.",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return <div className="text-center p-4">Loading subscriptions…</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          {selectedSubscriptions.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleGroupDelete}
              disabled={deleting}
            >
              <Trash className="mr-2 h-4 w-4" />
              Delete Selected ({selectedSubscriptions.length})
            </Button>
          )}
        </div>
        {/* You can add more group actions here */}
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={
                    filteredSubscriptions.length > 0 &&
                    selectedSubscriptions.length === filteredSubscriptions.length
                  }
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Billing</TableHead>
              <TableHead>Next Billing Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSubscriptions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No subscriptions found.
                </TableCell>
              </TableRow>
            ) : (
              filteredSubscriptions.map((subscription) => {
                const startDate = new Date(subscription.startDate)
                return (
                  <TableRow key={subscription.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedSubscriptions.includes(subscription.id)}
                        onCheckedChange={() => handleSelectOne(subscription.id)}
                        aria-label={`Select ${subscription.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {subscription.name}
                    </TableCell>
                    <TableCell>${subscription.cost.toFixed(2)}</TableCell>
                    <TableCell className="capitalize">
                      {subscription.billingFrequency}
                    </TableCell>
                    <TableCell>
                      {getNextBillingDate(
                        startDate,
                        subscription.billingFrequency
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        style={
                          subscription.category?.color
                            ? {
                                backgroundColor: subscription.category.color,
                                color: "#fff",
                              }
                            : undefined
                        }
                        variant="outline"
                      >
                        {subscription.category?.name ?? "Uncategorized"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/subscriptions/${subscription.id}`}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(subscription.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
