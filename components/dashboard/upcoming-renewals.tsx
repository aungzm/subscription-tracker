"use client";

import { format } from "date-fns";
import { CalendarClock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/currency";
import { getRenewalTiming } from "@/lib/renewals";

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
      {renewals.map((renewal) => {
        const renewalTiming = getRenewalTiming(new Date(renewal.nextRenewal));

        return (
          <Card key={renewal.id} className="bg-muted/20 ring-1 ring-border/60">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/12 text-primary">
                <CalendarClock className="size-4" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium leading-none">{renewal.name}</p>
                  <Badge variant="outline" className="capitalize">
                    {renewal.billingFrequency}
                  </Badge>
                  <Badge variant="secondary">
                    {renewalTiming.countdownLabel}
                  </Badge>
                  {renewalTiming.urgencyLabel && (
                    <Badge
                      variant="outline"
                      className={
                        renewalTiming.status === "today"
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                      }
                    >
                      {renewalTiming.urgencyLabel}
                    </Badge>
                  )}
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
        );
      })}
    </div>
  );
}
