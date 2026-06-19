"use client"

import { useEffect, useMemo, useState } from "react"
import { FileText, UploadCloud } from "lucide-react"
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
import { parseCsv } from "@/lib/import-csv"
import { formatCurrency } from "@/lib/currency"
import {
  detectMonthlySubscriptionCandidates,
  guessImportColumnMapping,
  normalizeTransactionRows,
  type ImportColumnMapping,
  type ImportColumnRole,
  type RawTransactionRow,
  type SubscriptionImportCandidate,
} from "@/lib/import-detection"

const REQUIRED_ROLES: ImportColumnRole[] = ["merchant", "transactionDate", "amount"]
const OPTIONAL_ROLES: ImportColumnRole[] = ["account", "currency"]
const NO_COLUMN = "__none__"

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

export function ImportCsvWizard() {
  const [fileName, setFileName] = useState<string | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<RawTransactionRow[]>([])
  const [mapping, setMapping] = useState<ImportColumnMapping>({})
  const [fallbackCurrency, setFallbackCurrency] = useState("USD")
  const [error, setError] = useState<string | null>(null)
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([])

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

  useEffect(() => {
    setReviewItems(
      candidates.map((candidate) => ({
        candidate,
        selected: candidate.matchQuality === "likely",
        name: candidate.suggestedName,
        cost: candidate.amount.toFixed(2),
        startDate: candidate.lastSeen.slice(0, 10),
      }))
    )
  }, [candidates])

  async function handleFileChange(file: File | undefined) {
    setError(null)

    if (!file) {
      return
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Choose a CSV file.")
      return
    }

    const text = await file.text()
    const parsed = parseCsv(text)

    if (parsed.headers.length === 0 || parsed.rows.length === 0) {
      setError("That CSV does not have readable rows.")
      return
    }

    setFileName(file.name)
    setHeaders(parsed.headers)
    setRows(parsed.rows)
    setMapping(guessImportColumnMapping(parsed.headers))
    setReviewItems([])
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
              {fileName ? fileName : "Choose a CSV file"}
            </span>
            <span className="text-sm text-muted-foreground">
              The raw file is parsed in this browser session.
            </span>
            <Input
              id="csv-file"
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(event) => handleFileChange(event.target.files?.[0])}
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
                  <div
                    key={item.candidate.id}
                    className="rounded-lg border border-border/70 p-4"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={item.selected}
                          onCheckedChange={(checked) =>
                            setReviewItems((current) =>
                              current.map((reviewItem, reviewIndex) =>
                                reviewIndex === index
                                  ? { ...reviewItem, selected: checked === true }
                                  : reviewItem
                              )
                            )
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
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {item.candidate.matchedTransactions.length} charges from{" "}
                            {new Date(item.candidate.firstSeen).toLocaleDateString()} to{" "}
                            {new Date(item.candidate.lastSeen).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[520px]">
                        <div className="space-y-2">
                          <Label htmlFor={`candidate-name-${index}`}>Name</Label>
                          <Input
                            id={`candidate-name-${index}`}
                            value={item.name}
                            onChange={(event) =>
                              setReviewItems((current) =>
                                current.map((reviewItem, reviewIndex) =>
                                  reviewIndex === index
                                    ? { ...reviewItem, name: event.target.value }
                                    : reviewItem
                                )
                              )
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
                              setReviewItems((current) =>
                                current.map((reviewItem, reviewIndex) =>
                                  reviewIndex === index
                                    ? { ...reviewItem, cost: event.target.value }
                                    : reviewItem
                                )
                              )
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
                              setReviewItems((current) =>
                                current.map((reviewItem, reviewIndex) =>
                                  reviewIndex === index
                                    ? { ...reviewItem, startDate: event.target.value }
                                    : reviewItem
                                )
                              )
                            }
                          />
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
                              <TableCell>
                                {transaction.accountLabel ?? "Not mapped"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
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
        <Button disabled={selectedCount === 0}>
          Import Selected ({selectedCount})
        </Button>
      </div>
    </div>
  )
}
