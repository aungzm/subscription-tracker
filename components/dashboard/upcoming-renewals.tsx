"use client";

import { format } from "date-fns";
import { CalendarClock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/currency";

interface UpcomingRenewal {
  id: string;
  name: string;
  nextRenewal: string; // string from API
  cost: number;
  currency: string;
  billingFrequency: string;
}

export function UpcomingRenewals({
  renewals,
}: {
  renewals: UpcomingRenewal[];
}) {
  if (renewals.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
        No renewals are scheduled in the next seven days.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {renewals.map((renewal) => (
        <Card key={renewal.id} className="bg-muted/20 ring-1 ring-border/60">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/12 text-primary">
              <CalendarClock className="size-4" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium leading-none">{renewal.name}</p>
                <Badge variant="outline" className="capitalize">
                  {renewal.billingFrequency}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                  {format(new Date(renewal.nextRenewal), "MMM d, yyyy")}
              </p>
            </div>
            <div className="font-medium">
              {formatCurrency(renewal.cost, renewal.currency)}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
