import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ImportCsvWizard } from "@/components/subscriptions/import-csv-wizard"

export default function ImportSubscriptionsPage() {
  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">Import Subscriptions</h2>
          <p className="text-sm text-muted-foreground">
            Find monthly subscriptions from credit card transactions before adding anything to your account.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/subscriptions">
            <ArrowLeft className="mr-2 size-4" />
            Back
          </Link>
        </Button>
      </div>

      <ImportCsvWizard />
    </div>
  )
}
