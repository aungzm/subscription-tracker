"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  addMonths,
  addYears,
  format,
  isAfter,
  setMonth,
  setYear,
} from "date-fns"
import { ArrowUpDown, Edit, MoreHorizontal, Search, Trash, X } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"

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

type SortOption =
  | "next-billing-asc"
  | "newest"
  | "oldest"
  | "name-asc"
  | "name-desc"
  | "cost-desc"
  | "cost-asc"
  | "billing-asc"

function getNextBillingDateValue(startDate: Date, billingFrequency: string): Date {
  const now = new Date()

  if (billingFrequency === "monthly") {
    let next = setMonth(new Date(now), now.getMonth())
    next.setDate(startDate.getDate())
    if (isAfter(now, next)) {
      next = addMonths(next, 1)
    }
    return next
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
    return next
  }

  return new Date(startDate)
}

function getNextBillingDate(startDate: Date, billingFrequency: string): string {
  return format(
    getNextBillingDateValue(startDate, billingFrequency),
    billingFrequency === "monthly" || billingFrequency === "yearly"
      ? "MMM d"
      : "MMM d, yyyy"
  )
}

export function SubscriptionsList({ billingFrequency }: SubscriptionsListProps) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [selectedSubscriptions, setSelectedSubscriptions] = useState<string[]>(
    []
  )
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("all")
  const [sortBy, setSortBy] = useState<SortOption>("next-billing-asc")

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

  const baseSubscriptions = billingFrequency
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

  const categoryOptions = Array.from(
    new Map(
      baseSubscriptions
        .filter((sub) => sub.category)
        .map((sub) => [sub.category!.id, sub.category!])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name))

  const paymentMethodOptions = Array.from(
    new Map(
      baseSubscriptions
        .filter((sub) => sub.paymentMethod)
        .map((sub) => [sub.paymentMethod!.id, sub.paymentMethod!])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name))

  const visibleSubscriptions = [...baseSubscriptions]
    .filter((sub) => {
      const normalizedQuery = searchQuery.trim().toLowerCase()
      if (!normalizedQuery) return true

      return [
        sub.name,
        sub.category?.name ?? "uncategorized",
        sub.paymentMethod?.name ?? "unassigned",
        sub.billingFrequency,
      ].some((value) => value.toLowerCase().includes(normalizedQuery))
    })
    .filter((sub) =>
      selectedCategory === "all"
        ? true
        : selectedCategory === "uncategorized"
          ? !sub.category
          : sub.category?.id === selectedCategory
    )
    .filter((sub) =>
      selectedPaymentMethod === "all"
        ? true
        : selectedPaymentMethod === "unassigned"
          ? !sub.paymentMethod
          : sub.paymentMethod?.id === selectedPaymentMethod
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
        case "oldest":
          return new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
        case "name-asc":
          return a.name.localeCompare(b.name)
        case "name-desc":
          return b.name.localeCompare(a.name)
        case "cost-desc":
          return b.cost - a.cost
        case "cost-asc":
          return a.cost - b.cost
        case "billing-asc":
          return a.billingFrequency.localeCompare(b.billingFrequency)
        case "next-billing-asc":
        default:
          return (
            getNextBillingDateValue(
              new Date(a.startDate),
              a.billingFrequency
            ).getTime() -
            getNextBillingDateValue(
              new Date(b.startDate),
              b.billingFrequency
            ).getTime()
          )
      }
    })

  const selectedVisibleCount = visibleSubscriptions.filter((sub) =>
    selectedSubscriptions.includes(sub.id)
  ).length
  const allVisibleSelected =
    visibleSubscriptions.length > 0 &&
    selectedVisibleCount === visibleSubscriptions.length
  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    selectedCategory !== "all" ||
    selectedPaymentMethod !== "all" ||
    sortBy !== "next-billing-asc"

  const handleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedSubscriptions((prev) =>
        prev.filter(
          (id) => !visibleSubscriptions.some((subscription) => subscription.id === id)
        )
      )
      return
    }

    setSelectedSubscriptions((prev) => [
      ...prev,
      ...visibleSubscriptions
        .map((sub) => sub.id)
        .filter((id) => !prev.includes(id)),
    ])
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

  const handleGroupDelete = async () => {
    if (
      selectedSubscriptions.length === 0 ||
      !window.confirm(
        `Delete ${selectedSubscriptions.length} selected subscription(s)?`
      )
    ) {
      return
    }

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
      console.error(error)
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
    return <div className="p-4 text-center">Loading subscriptions...</div>
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/70 bg-card/50 p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search subscriptions, categories, or payment methods"
              className="pl-8"
              aria-label="Search subscriptions"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Select
              value={sortBy}
              onValueChange={(value) => setSortBy(value as SortOption)}
            >
              <SelectTrigger className="w-full sm:min-w-44">
                <ArrowUpDown className="size-4 text-muted-foreground" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="next-billing-asc">Next billing date</SelectItem>
                <SelectItem value="newest">Newest added</SelectItem>
                <SelectItem value="oldest">Oldest added</SelectItem>
                <SelectItem value="name-asc">Name: A to Z</SelectItem>
                <SelectItem value="name-desc">Name: Z to A</SelectItem>
                <SelectItem value="cost-desc">Cost: high to low</SelectItem>
                <SelectItem value="cost-asc">Cost: low to high</SelectItem>
                <SelectItem value="billing-asc">Billing frequency</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:min-w-40">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                <SelectItem value="uncategorized">Uncategorized</SelectItem>
                {categoryOptions.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedPaymentMethod}
              onValueChange={setSelectedPaymentMethod}
            >
              <SelectTrigger className="w-full sm:min-w-40">
                <SelectValue placeholder="All payment methods" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All payment methods</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {paymentMethodOptions.map((paymentMethod) => (
                  <SelectItem key={paymentMethod.id} value={paymentMethod.id}>
                    {paymentMethod.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {visibleSubscriptions.length} of {baseSubscriptions.length} subscriptions
          </p>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("")
                  setSelectedCategory("all")
                  setSelectedPaymentMethod("all")
                  setSortBy("next-billing-asc")
                }}
              >
                <X className="mr-2 h-4 w-4" />
                Clear filters
              </Button>
            )}
            {selectedSubscriptions.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {selectedSubscriptions.length} selected
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mb-2 flex items-center justify-between">
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
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={allVisibleSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all visible subscriptions"
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Billing</TableHead>
              <TableHead>Next Billing Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleSubscriptions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No subscriptions match the current filters.
                </TableCell>
              </TableRow>
            ) : (
              visibleSubscriptions.map((subscription) => {
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
                      {getNextBillingDate(startDate, subscription.billingFrequency)}
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
                    <TableCell className="text-muted-foreground">
                      {subscription.paymentMethod?.name ?? "Unassigned"}
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
                            <Link href={`/subscriptions/${subscription.id}`}>
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
