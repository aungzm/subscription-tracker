export type ImportColumnRole =
  | "merchant"
  | "transactionDate"
  | "amount"
  | "account"
  | "currency"

export type ImportColumnMapping = Partial<Record<ImportColumnRole, string>>

export type RawTransactionRow = Record<string, string | number | null | undefined>

export type ImportedTransaction = {
  merchant: string
  normalizedMerchant: string
  date: string
  amount: number
  accountLabel: string | null
  currency: string
}

export type SubscriptionImportCandidate = {
  id: string
  merchantName: string
  suggestedName: string
  amount: number
  currency: string
  billingFrequency: "monthly"
  firstSeen: string
  lastSeen: string
  confidence: number
  matchQuality: "possible" | "likely"
  matchedTransactions: ImportedTransaction[]
}

export type ExistingSubscriptionForImport = {
  id: string
  name: string
  cost: number
  currency: string
  billingFrequency: string
}

const COLUMN_HINTS: Record<ImportColumnRole, string[]> = {
  merchant: ["merchant", "description", "payee", "name", "details", "memo"],
  transactionDate: ["transaction date", "posted date", "post date", "date"],
  amount: ["amount", "charge", "debit", "withdrawal", "paid out"],
  account: ["account", "card", "card number", "last four", "last4"],
  currency: ["currency", "currency code"],
}

const NOISE_WORDS = [
  "card purchase",
  "purchase authorized",
  "recurring card purchase",
  "debit card purchase",
  "online payment",
  "pos purchase",
]

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ")
}

function getCell(row: RawTransactionRow, columnName: string | undefined) {
  if (!columnName) {
    return undefined
  }

  return row[columnName]
}

function toText(value: string | number | null | undefined) {
  return value === null || value === undefined ? "" : String(value).trim()
}

export function guessImportColumnMapping(headers: string[]): ImportColumnMapping {
  const normalizedHeaders = headers.map((header) => ({
    original: header,
    normalized: normalizeHeader(header),
  }))

  const mapping: ImportColumnMapping = {}

  for (const role of Object.keys(COLUMN_HINTS) as ImportColumnRole[]) {
    const exactMatch = normalizedHeaders.find((header) =>
      COLUMN_HINTS[role].includes(header.normalized)
    )
    if (exactMatch) {
      mapping[role] = exactMatch.original
      continue
    }

    const partialMatch = normalizedHeaders.find((header) =>
      COLUMN_HINTS[role].some((hint) => header.normalized.includes(hint))
    )
    if (partialMatch) {
      mapping[role] = partialMatch.original
    }
  }

  return mapping
}

export function normalizeMerchantName(value: string) {
  let merchant = value.toLowerCase()

  for (const noise of NOISE_WORDS) {
    merchant = merchant.replaceAll(noise, " ")
  }

  merchant = merchant
    .replace(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, " ")
    .replace(/\b\d{8,}\b/g, " ")
    .replace(/\b[a-z]{2}\b$/i, " ")
    .replace(/[^a-z0-9&.' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  return merchant
}

export function toSuggestedSubscriptionName(normalizedMerchant: string) {
  return normalizedMerchant
    .split(" ")
    .filter(Boolean)
    .map((word) => {
      if (word === "&") {
        return word
      }

      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(" ")
}

export function parseImportAmount(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.abs(value) : null
  }

  const text = toText(value)
  if (!text) {
    return null
  }

  const isParenthesized = /^\(.*\)$/.test(text)
  const numeric = Number(text.replace(/[,$()\s]/g, ""))

  if (!Number.isFinite(numeric) || numeric === 0) {
    return null
  }

  return Math.abs(isParenthesized ? -numeric : numeric)
}

export function normalizeTransactionRows(params: {
  rows: RawTransactionRow[]
  mapping: ImportColumnMapping
  fallbackCurrency: string
}) {
  const { rows, mapping, fallbackCurrency } = params

  return rows.flatMap((row) => {
    const merchant = toText(getCell(row, mapping.merchant))
    const normalizedMerchant = normalizeMerchantName(merchant)
    const dateValue = toText(getCell(row, mapping.transactionDate))
    const date = new Date(dateValue)
    const amount = parseImportAmount(getCell(row, mapping.amount))
    const rowCurrency = toText(getCell(row, mapping.currency))
    const currency = (rowCurrency || fallbackCurrency).toUpperCase()

    if (!merchant || !normalizedMerchant || Number.isNaN(date.getTime()) || amount === null) {
      return []
    }

    return [
      {
        merchant,
        normalizedMerchant,
        date: date.toISOString(),
        amount,
        accountLabel: toText(getCell(row, mapping.account)) || null,
        currency,
      },
    ]
  })
}

function roundCurrency(value: number) {
  return Number(value.toFixed(2))
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function daysBetween(a: Date, b: Date) {
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.round((b.getTime() - a.getTime()) / msPerDay)
}

function hasMonthlyCadence(transactions: ImportedTransaction[]) {
  if (transactions.length < 2) {
    return false
  }

  const gaps = transactions
    .slice(1)
    .map((transaction, index) =>
      daysBetween(new Date(transactions[index].date), new Date(transaction.date))
    )

  return gaps.some((gap) => gap >= 26 && gap <= 35)
}

function hasStableAmount(transactions: ImportedTransaction[]) {
  const amounts = transactions.map((transaction) => transaction.amount)
  const avg = average(amounts)
  const tolerance = Math.max(1, avg * 0.05)

  return amounts.every((amount) => Math.abs(amount - avg) <= tolerance)
}

function candidateConfidence(transactions: ImportedTransaction[]) {
  const countScore = transactions.length >= 3 ? 0.45 : 0.25
  const cadenceScore = hasMonthlyCadence(transactions) ? 0.35 : 0
  const amountScore = hasStableAmount(transactions) ? 0.2 : 0

  return roundCurrency(Math.min(1, countScore + cadenceScore + amountScore))
}

export function detectMonthlySubscriptionCandidates(
  transactions: ImportedTransaction[]
): SubscriptionImportCandidate[] {
  const groups = new Map<string, ImportedTransaction[]>()

  for (const transaction of transactions) {
    const existing = groups.get(transaction.normalizedMerchant) ?? []
    existing.push(transaction)
    groups.set(transaction.normalizedMerchant, existing)
  }

  const candidates: SubscriptionImportCandidate[] = []

  for (const [normalizedMerchant, group] of groups) {
    const sorted = [...group].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    if (sorted.length < 2 || !hasMonthlyCadence(sorted) || !hasStableAmount(sorted)) {
      continue
    }

    const amount = roundCurrency(average(sorted.map((transaction) => transaction.amount)))
    const firstSeen = sorted[0].date
    const lastSeen = sorted[sorted.length - 1].date
    const confidence = candidateConfidence(sorted)

    candidates.push({
      id: `${normalizedMerchant}-${amount}-${firstSeen}`,
      merchantName: sorted[0].merchant,
      suggestedName: toSuggestedSubscriptionName(normalizedMerchant),
      amount,
      currency: sorted[0].currency,
      billingFrequency: "monthly",
      firstSeen,
      lastSeen,
      confidence,
      matchQuality: sorted.length >= 3 ? "likely" : "possible",
      matchedTransactions: sorted,
    })
  }

  return candidates.sort((a, b) => b.confidence - a.confidence)
}

export function getSubscriptionImportDuplicateWarning(params: {
  candidate: Pick<SubscriptionImportCandidate, "suggestedName" | "amount" | "currency">
  existingSubscriptions: ExistingSubscriptionForImport[]
}) {
  const candidateName = normalizeMerchantName(params.candidate.suggestedName)

  const match = params.existingSubscriptions.find((subscription) => {
    if (subscription.billingFrequency !== "monthly") {
      return false
    }

    if (subscription.currency.toUpperCase() !== params.candidate.currency.toUpperCase()) {
      return false
    }

    const existingName = normalizeMerchantName(subscription.name)
    const namesMatch =
      existingName === candidateName ||
      existingName.includes(candidateName) ||
      candidateName.includes(existingName)
    const amountTolerance = Math.max(1, params.candidate.amount * 0.05)
    const amountMatches =
      Math.abs(subscription.cost - params.candidate.amount) <= amountTolerance

    return namesMatch && amountMatches
  })

  return match ? `Looks like existing subscription: ${match.name}` : null
}
