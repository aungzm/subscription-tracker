"use client"

import { useMemo, useState } from "react"
import { FileText, UploadCloud } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import {
  guessImportColumnMapping,
  normalizeTransactionRows,
  type ImportColumnMapping,
  type ImportColumnRole,
  type RawTransactionRow,
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
  }

  const sampleRows = rows.slice(0, 5)
  const ready = isMappingReady(mapping, fallbackCurrency)

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
                      {!REQUIRED_ROLES.includes(role) && (
                        <SelectItem value={NO_COLUMN}>Do not use</SelectItem>
                      )}
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
                  ? `${normalizedTransactions.length} usable transactions found`
                  : "Map merchant, date, amount, and currency"}
              </div>
              <p className="mt-1 text-muted-foreground">
                Detection will run after these fields are ready.
              </p>
            </div>
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
        <Button disabled={!ready}>Review Detected Subscriptions</Button>
      </div>
    </div>
  )
}
