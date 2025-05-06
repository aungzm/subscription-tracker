"use client";

import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";

interface UpcomingRenewal {
  id: string;
  name: string;
  nextRenewal: string; // string from API
  cost: number;
  billingFrequency: string;
}

export function UpcomingRenewals({
  renewals,
}: {
  renewals: UpcomingRenewal[];
}) {
  return (
    <div className="space-y-4">
      {renewals.map((renewal) => (
        <Card key={renewal.id}>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-none">{renewal.name}</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(renewal.nextRenewal), "MMM d, yyyy")}
                </p>
              </div>
              <div className="font-medium">${renewal.cost.toFixed(2)}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
