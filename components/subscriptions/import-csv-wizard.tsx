"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, FileText, UploadCloud } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { parseCsv } from "@/lib/import-csv"
import { formatCurrency } from "@/lib/currency"
import {
  detectMonthlySubscriptionCandidates,
  getImportDateRangeSummary,
  getSubscriptionImportDuplicateWarning,
  guessImportColumnMapping,
  inferPaymentMethodFromAccountLabel,
  normalizeTransactionRows,
  type ExistingSubscriptionForImport,
  type ImportedPaymentMethodSuggestion,
  type ImportColumnMapping,
  type ImportColumnRole,
  type RawTransactionRow,
  type SubscriptionImportCandidate,
} from "@/lib/import-detection"

const REQUIRED_ROLES: ImportColumnRole[] = ["merchant", "transactionDate", "amount"]
const OPTIONAL_ROLES: ImportColumnRole[] = ["account", "currency"]
const NO_COLUMN = "__none__"
const NO_PAYMENT_METHOD = "__none__"
const CREATE_PAYMENT_METHOD = "__create__"

const ROLE_LABELS: Record<ImportColumnRole, string> = {
  merchant: "Merchant",
  transactionDate: "Transaction date",
  amount: "Amount",
  account: "Card or account",
  currency: "Currency column",
}

type ReviewItem = {
  candidate: SubscriptionImportCandidate
  selected: boolean
  name: string
  cost: string
  startDate: string
  paymentMethodChoice: string
  paymentMethodSuggestion: ImportedPaymentMethodSuggestion | null
}

type ExistingPaymentMethod = {
  id: string
  name: string
  type: ImportedPaymentMethodSuggestion["type"]
  lastFour: string | null
}

function setMappingValue(
  mapping: ImportColumnMapping,
  role: ImportColumnRole,
  value: string
) {
  return {
    ...mapping,
    [role]: value === NO_COLUMN ? undefined : value,
  }
}

function isMappingReady(mapping: ImportColumnMapping, fallbackCurrency: string) {
  const hasRequiredColumns = REQUIRED_ROLES.every((role) => Boolean(mapping[role]))
  const hasCurrency = Boolean(mapping.currency) || fallbackCurrency.trim().length === 3

  return hasRequiredColumns && hasCurrency
}

function getPaymentMethodSuggestionKey(suggestion: ImportedPaymentMethodSuggestion) {
  return [suggestion.name, suggestion.type, suggestion.lastFour ?? ""].join("|")
}

function findMatchingPaymentMethod(
  suggestion: ImportedPaymentMethodSuggestion,
  paymentMethods: ExistingPaymentMethod[]
) {
  return paymentMethods.find((paymentMethod) => {
    if (paymentMethod.type !== suggestion.type) {
      return false
    }

    if (suggestion.lastFour && paymentMethod.lastFour === suggestion.lastFour) {
      return true
    }

    return paymentMethod.name.toLowerCase() === suggestion.name.toLowerCase()
  })
}

export function ImportCsvWizard() {
  const router = useRouter()
  const [fileNames, setFileNames] = useState<string[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<RawTransactionRow[]>([])
  const [mapping, setMapping] = useState<ImportColumnMapping>({})
  const [fallbackCurrency, setFallbackCurrency] = useState("USD")
  const [error, setError] = useState<string | null>(null)
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [existingSubscriptions, setExistingSubscriptions] = useState<
    ExistingSubscriptionForImport[]
  >([])
  const [paymentMethods, setPaymentMethods] = useState<ExistingPaymentMethod[]>([])

  const normalizedTransactions = useMemo(() => {
    if (!isMappingReady(mapping, fallbackCurrency)) {
      return []
    }

    return normalizeTransactionRows({
      rows,
      mapping,
      fallbackCurrency,
    })
  }, [fallbackCurrency, mapping, rows])

  const candidates = useMemo(
    () => detectMonthlySubscriptionCandidates(normalizedTransactions),
    [normalizedTransactions]
  )
  const dateRangeSummary = useMemo(
    () => getImportDateRangeSummary(normalizedTransactions),
    [normalizedTransactions]
  )

  useEffect(() => {
    setReviewItems(
      candidates.map((candidate) => {
        const duplicateWarning = getSubscriptionImportDuplicateWarning({
          candidate,
          existingSubscriptions,
        })
        const paymentMethodSuggestion = inferPaymentMethodFromAccountLabel(
          candidate.matchedTransactions.find((transaction) => transaction.accountLabel)
            ?.accountLabel
        )
        const matchingPaymentMethod = paymentMethodSuggestion
          ? findMatchingPaymentMethod(paymentMethodSuggestion, paymentMethods)
          : null

        return {
          candidate,
          selected:
            candidate.matchQuality === "likely" &&
            !duplicateWarning &&
            (dateRangeSummary?.hasEnoughRangeForMonthlyDetection ?? true),
          name: candidate.suggestedName,
          cost: candidate.amount.toFixed(2),
          startDate: candidate.lastSeen.slice(0, 10),
          paymentMethodChoice:
            matchingPaymentMethod?.id ??
            (paymentMethodSuggestion ? CREATE_PAYMENT_METHOD : NO_PAYMENT_METHOD),
          paymentMethodSuggestion,
        }
      })
    )
  }, [candidates, dateRangeSummary, existingSubscriptions, paymentMethods])

  useEffect(() => {
    fetch("/api/subscriptions")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Unable to load existing subscriptions")
        }
        return response.json()
      })
      .then((data: ExistingSubscriptionForImport[]) => {
        setExistingSubscriptions(data)
      })
      .catch(() => {
        setExistingSubscriptions([])
      })
  }, [])

  useEffect(() => {
    fetch("/api/payment")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Unable to load payment methods")
        }
        return response.json()
      })
      .then((data: ExistingPaymentMethod[]) => {
        setPaymentMethods(data)
      })
      .catch(() => {
        setPaymentMethods([])
      })
  }, [])

  async function handleFileChange(fileList: FileList | null | undefined) {
    setError(null)

    const files = Array.from(fileList ?? [])

    if (files.length === 0) {
      return
    }

    if (files.some((file) => !file.name.toLowerCase().endsWith(".csv"))) {
      setError("Choose CSV files only.")
      return
    }

    const parsedFiles = await Promise.all(
      files.map(async (file) => ({
        name: file.name,
        parsed: parseCsv(await file.text()),
      }))
    )

    const readableFiles = parsedFiles.filter(
      (file) => file.parsed.headers.length > 0 && file.parsed.rows.length > 0
    )

    if (readableFiles.length === 0) {
      setError("Those CSV files do not have readable rows.")
      return
    }

    const nextHeaders = Array.from(
      new Set(readableFiles.flatMap((file) => file.parsed.headers))
    )

    setFileNames(readableFiles.map((file) => file.name))
    setHeaders(nextHeaders)
    setRows(readableFiles.flatMap((file) => file.parsed.rows))
    setMapping(guessImportColumnMapping(nextHeaders))
    setReviewItems([])
  }

  async function handleImportSelected() {
    const selectedItems = reviewItems.filter((item) => item.selected)

    if (selectedItems.length === 0) {
      toast({
        title: "Nothing to import",
        description: "Select at least one valid subscription first.",
        variant: "destructive",
      })
      return
    }

    setIsImporting(true)

    try {
      const paymentMethodIds = await resolvePaymentMethodChoices(selectedItems)
      const selectedSubscriptions = selectedItems
        .map((item) => {
          const paymentMethod = paymentMethodIds.get(item.candidate.id)
          return {
            name: item.name.trim(),
            cost: Number(item.cost),
            currency: item.candidate.currency,
            billingFrequency: "monthly" as const,
            startDate: item.startDate,
            paymentMethod,
            notes: `Imported from CSV after matching ${item.candidate.matchedTransactions.length} transactions.`,
          }
        })
        .filter(
          (subscription) =>
            subscription.name &&
            Number.isFinite(subscription.cost) &&
            subscription.cost > 0 &&
            !Number.isNaN(new Date(subscription.startDate).getTime())
        )

      if (selectedSubscriptions.length === 0) {
        throw new Error("Select at least one valid subscription first.")
      }

      const response = await fetch("/api/subscriptions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptions: selectedSubscriptions }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error ?? "Import failed")
      }

      toast({
        title: "Subscriptions imported",
        description: `${data.imported} subscription${data.imported === 1 ? "" : "s"} added.`,
      })
      router.push("/subscriptions")
      router.refresh()
    } catch (importError) {
      toast({
        title: "Import failed",
        description:
          importError instanceof Error
            ? importError.message
            : "Unable to import selected subscriptions.",
        variant: "destructive",
      })
    } finally {
      setIsImporting(false)
    }
  }

  async function resolvePaymentMethodChoices(items: ReviewItem[]) {
    const ids = new Map<string, string | undefined>()
    const createdByKey = new Map<string, string>()

    for (const item of items) {
      if (item.paymentMethodChoice === NO_PAYMENT_METHOD) {
        ids.set(item.candidate.id, undefined)
        continue
      }

      if (item.paymentMethodChoice !== CREATE_PAYMENT_METHOD) {
        ids.set(item.candidate.id, item.paymentMethodChoice)
        continue
      }

      if (!item.paymentMethodSuggestion) {
        ids.set(item.candidate.id, undefined)
        continue
      }

      const key = getPaymentMethodSuggestionKey(item.paymentMethodSuggestion)
      const alreadyCreatedId = createdByKey.get(key)
      if (alreadyCreatedId) {
        ids.set(item.candidate.id, alreadyCreatedId)
        continue
      }

      const response = await fetch("/api/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.paymentMethodSuggestion),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error ?? "Unable to create payment method")
      }

      createdByKey.set(key, data.id)
      ids.set(item.candidate.id, data.id)
    }

    return ids
  }

  const sampleRows = rows.slice(0, 5)
  const ready = isMappingReady(mapping, fallbackCurrency)
  const selectedCount = reviewItems.filter((item) => item.selected).length

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload CSV</CardTitle>
          <CardDescription>
            Select a credit card export, then match its columns to the fields below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Label
            htmlFor="csv-file"
            className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-card/60 px-4 py-8 text-center transition-colors hover:bg-accent/40"
          >
            <UploadCloud className="size-8 text-muted-foreground" />
            <span className="font-medium">
              {fileNames.length > 0
                ? `${fileNames.length} file${fileNames.length === 1 ? "" : "s"} selected`
                : "Choose CSV files"}
            </span>
            <span className="text-sm text-muted-foreground">
              Upload two or more months when you can. The raw files stay in this browser session.
            </span>
            <Input
              id="csv-file"
              type="file"
              accept=".csv,text/csv"
              multiple
              className="sr-only"
              onChange={(event) => handleFileChange(event.target.files)}
            />
          </Label>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      {headers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Map Columns</CardTitle>
            <CardDescription>
              Pick the CSV columns used for detection. Currency can come from the file or one fallback value.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              {[...REQUIRED_ROLES, ...OPTIONAL_ROLES].map((role) => (
                <div key={role} className="space-y-2">
                  <Label>
                    {ROLE_LABELS[role]}
                    {REQUIRED_ROLES.includes(role) ? "" : " optional"}
                  </Label>
                  <Select
                    value={mapping[role] ?? NO_COLUMN}
                    onValueChange={(value) =>
                      setMapping((current) => setMappingValue(current, role, value))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        value={NO_COLUMN}
                        disabled={REQUIRED_ROLES.includes(role)}
                      >
                        {REQUIRED_ROLES.includes(role) ? "Choose column" : "Do not use"}
                      </SelectItem>
                      {headers.map((header) => (
                        <SelectItem key={`${role}-${header}`} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
              <div className="space-y-2">
                <Label htmlFor="fallback-currency">Fallback currency</Label>
                <Input
                  id="fallback-currency"
                  value={fallbackCurrency}
                  maxLength={3}
                  onChange={(event) =>
                    setFallbackCurrency(event.target.value.toUpperCase())
                  }
                  placeholder="USD"
                />
              </div>
            </div>

            <div className="rounded-lg border border-border/70 bg-muted/30 p-3 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <FileText className="size-4 text-muted-foreground" />
                {ready
                  ? `${normalizedTransactions.length} usable transactions, ${candidates.length} monthly matches`
                  : "Map merchant, date, amount, and currency"}
              </div>
              <p className="mt-1 text-muted-foreground">
                Two matching charges are possible. Three or more are likely.
              </p>
            </div>
            {ready && dateRangeSummary && (
              <Alert
                variant={
                  dateRangeSummary.hasEnoughRangeForMonthlyDetection
                    ? "default"
                    : "destructive"
                }
              >
                <AlertTriangle className="size-4" />
                <AlertTitle>
                  {dateRangeSummary.hasEnoughRangeForMonthlyDetection
                    ? "Date range looks usable"
                    : "Upload more history if you have it"}
                </AlertTitle>
                <AlertDescription>
                  The mapped transactions cover {dateRangeSummary.daySpan} days, from{" "}
                  {new Date(dateRangeSummary.firstTransactionDate).toLocaleDateString()} to{" "}
                  {new Date(dateRangeSummary.lastTransactionDate).toLocaleDateString()}.
                  {!dateRangeSummary.hasEnoughRangeForMonthlyDetection &&
                    " One month of data can miss subscriptions or mark normal purchases as recurring, so matches will stay unchecked by default."}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {ready && (
        <Card>
          <CardHeader>
            <CardTitle>Review Detected Subscriptions</CardTitle>
            <CardDescription>
              Confirm the matches before anything is imported.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {reviewItems.length === 0 ? (
              <div className="rounded-lg border border-border/70 bg-muted/30 p-6 text-sm text-muted-foreground">
                No monthly subscription patterns found in the mapped rows.
              </div>
            ) : (
              <div className="space-y-3">
                {reviewItems.map((item, index) => (
                  <ReviewCandidateCard
                    key={item.candidate.id}
                    item={item}
                    index={index}
                    existingSubscriptions={existingSubscriptions}
                    paymentMethods={paymentMethods}
                    onChange={(nextItem) =>
                      setReviewItems((current) =>
                        current.map((reviewItem, reviewIndex) =>
                          reviewIndex === index ? nextItem : reviewItem
                        )
                      )
                    }
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {sampleRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sample Rows</CardTitle>
            <CardDescription>First rows from the selected file.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {headers.slice(0, 6).map((header) => (
                      <TableHead key={header}>{header}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sampleRows.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {headers.slice(0, 6).map((header) => (
                        <TableCell key={`${rowIndex}-${header}`} className="max-w-56 truncate">
                          {String(row[header] ?? "")}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button
          type="button"
          disabled={selectedCount === 0 || isImporting}
          onClick={handleImportSelected}
        >
          {isImporting ? "Importing..." : `Import Selected (${selectedCount})`}
        </Button>
      </div>
    </div>
  )
}

function ReviewCandidateCard({
  item,
  index,
  existingSubscriptions,
  paymentMethods,
  onChange,
}: {
  item: ReviewItem
  index: number
  existingSubscriptions: ExistingSubscriptionForImport[]
  paymentMethods: ExistingPaymentMethod[]
  onChange: (item: ReviewItem) => void
}) {
  const duplicateWarning = getSubscriptionImportDuplicateWarning({
    candidate: {
      ...item.candidate,
      suggestedName: item.name,
      amount: Number(item.cost),
    },
    existingSubscriptions,
  })

  return (
    <div className="rounded-lg border border-border/70 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={item.selected}
            onCheckedChange={(checked) =>
              onChange({ ...item, selected: checked === true })
            }
            aria-label={`Select ${item.name}`}
          />
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-medium">{item.name}</h3>
              <Badge
                variant={
                  item.candidate.matchQuality === "likely"
                    ? "default"
                    : "secondary"
                }
              >
                {item.candidate.matchQuality}
              </Badge>
              <Badge variant="outline">
                {Math.round(item.candidate.confidence * 100)}%
              </Badge>
              {duplicateWarning && (
                <Badge variant="destructive">Duplicate?</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {item.candidate.matchedTransactions.length} charges from{" "}
              {new Date(item.candidate.firstSeen).toLocaleDateString()} to{" "}
              {new Date(item.candidate.lastSeen).toLocaleDateString()}
            </p>
            {duplicateWarning && (
              <p className="text-sm text-destructive">{duplicateWarning}</p>
            )}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[640px] lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor={`candidate-name-${index}`}>Name</Label>
            <Input
              id={`candidate-name-${index}`}
              value={item.name}
              onChange={(event) =>
                onChange({ ...item, name: event.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`candidate-cost-${index}`}>Monthly cost</Label>
            <Input
              id={`candidate-cost-${index}`}
              type="number"
              step="0.01"
              value={item.cost}
              onChange={(event) =>
                onChange({ ...item, cost: event.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`candidate-start-${index}`}>Start date</Label>
            <Input
              id={`candidate-start-${index}`}
              type="date"
              value={item.startDate}
              onChange={(event) =>
                onChange({ ...item, startDate: event.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Payment</Label>
            <Select
              value={item.paymentMethodChoice}
              onValueChange={(value) =>
                onChange({ ...item, paymentMethodChoice: value })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PAYMENT_METHOD}>Do not assign</SelectItem>
                {item.paymentMethodSuggestion && (
                  <SelectItem value={CREATE_PAYMENT_METHOD}>
                    Create {item.paymentMethodSuggestion.name}
                  </SelectItem>
                )}
                {paymentMethods.map((paymentMethod) => (
                  <SelectItem key={paymentMethod.id} value={paymentMethod.id}>
                    {paymentMethod.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Merchant text</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Account</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {item.candidate.matchedTransactions.map((transaction) => (
              <TableRow key={`${item.candidate.id}-${transaction.date}`}>
                <TableCell>
                  {new Date(transaction.date).toLocaleDateString()}
                </TableCell>
                <TableCell className="max-w-72 truncate">
                  {transaction.merchant}
                </TableCell>
                <TableCell>
                  {formatCurrency(transaction.amount, transaction.currency)}
                </TableCell>
                <TableCell>{transaction.accountLabel ?? "Not mapped"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
