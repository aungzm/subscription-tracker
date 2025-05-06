"use client";

import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface RecentSubscription {
  id: string;
  name: string;
  cost: number;
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
            <TableCell>${subscription.cost.toFixed(2)}</TableCell>
            <TableCell className="capitalize">{subscription.billingFrequency}</TableCell>
            <TableCell>
              {format(new Date(subscription.startDate), "MMM d, yyyy")}
            </TableCell>
            <TableCell>
              <Badge style={{ backgroundColor: subscription.category_color }}>
                {subscription.category}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
