"use client";

import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/currency";

interface RecentSubscription {
  id: string;
  name: string;
  cost: number;
  currency: string;
  billingFrequency: string;
  startDate: string; // string from API
  category: string;
  category_color: string;
}

export function RecentSubscriptions({
  subscriptions,
}: {
  subscriptions: RecentSubscription[];
}) {
  if (subscriptions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
        No subscriptions have been added yet.
      </div>
    );
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
        {subscriptions.map((subscription) => (
          <TableRow key={subscription.id}>
            <TableCell className="font-medium">{subscription.name}</TableCell>
            <TableCell className="font-medium">
              {formatCurrency(subscription.cost, subscription.currency)}
            </TableCell>
            <TableCell className="capitalize text-muted-foreground">{subscription.billingFrequency}</TableCell>
            <TableCell>
              {format(new Date(subscription.startDate), "MMM d, yyyy")}
            </TableCell>
            <TableCell>
              <Badge
                variant="secondary"
                className="border-transparent text-foreground"
                style={{ backgroundColor: `${subscription.category_color}33` }}
              >
                {subscription.category}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
