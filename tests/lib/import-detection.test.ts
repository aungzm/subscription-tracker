import { readFileSync } from "fs"
import { join } from "path"

import { parseCsv } from "@/lib/import-csv"
import {
  detectMonthlySubscriptionCandidates,
  getImportDateRangeSummary,
  getSubscriptionImportDuplicateWarning,
  guessImportColumnMapping,
  inferPaymentMethodFromAccountLabel,
  normalizeMerchantName,
  normalizeTransactionRows,
  parseImportAmount,
  toSuggestedSubscriptionName,
} from "@/lib/import-detection"

describe("CSV import detection", () => {
  it("guesses common credit card CSV columns", () => {
    expect(
      guessImportColumnMapping([
        "Transaction Date",
        "Description",
        "Amount",
        "Card",
        "Currency",
      ])
    ).toEqual({
      transactionDate: "Transaction Date",
      merchant: "Description",
      amount: "Amount",
      account: "Card",
      currency: "Currency",
    })
  })

  it("cleans noisy merchant names into editable subscription names", () => {
    const normalized = normalizeMerchantName("APPLE.COM/BILL 866-712-7753 CA")

    expect(normalized).toBe("apple.com bill")
    expect(toSuggestedSubscriptionName(normalized)).toBe("Apple.com Bill")
  })

  it("parses card statement amount formats as positive charges", () => {
    expect(parseImportAmount("$12.99")).toBe(12.99)
    expect(parseImportAmount("-12.99")).toBe(12.99)
    expect(parseImportAmount("(12.99)")).toBe(12.99)
    expect(parseImportAmount("")).toBeNull()
  })

  it("normalizes mapped CSV rows and skips unusable rows", () => {
    const transactions = normalizeTransactionRows({
      fallbackCurrency: "usd",
      mapping: {
        merchant: "Description",
        transactionDate: "Date",
        amount: "Amount",
        account: "Card",
      },
      rows: [
        {
          Date: "2026-01-15",
          Description: "Netflix.com",
          Amount: "-15.99",
          Card: "Visa ending 1234",
        },
        {
          Date: "not a date",
          Description: "Bad row",
          Amount: "-10",
          Card: "Visa ending 1234",
        },
      ],
    })

    expect(transactions).toHaveLength(1)
    expect(transactions[0]).toMatchObject({
      merchant: "Netflix.com",
      normalizedMerchant: "netflix.com",
      amount: 15.99,
      accountLabel: "Visa ending 1234",
      currency: "USD",
    })
  })

  it("supports compact YYYYMMDD statement dates", () => {
    const [transaction] = normalizeTransactionRows({
      fallbackCurrency: "CAD",
      mapping: {
        merchant: "Description",
        transactionDate: "Transaction Date",
        amount: "Transaction Amount",
        account: "Card #",
      },
      rows: [
        {
          "Transaction Date": "20260603",
          Description: "OPENROUTER INC NEW YORK NY",
          "Transaction Amount": "22.62",
          "Card #": "'4000000000001234'",
        },
      ],
    })

    expect(transaction).toMatchObject({
      merchant: "OPENROUTER INC NEW YORK NY",
      amount: 22.62,
      accountLabel: "'4000000000001234'",
      currency: "CAD",
    })
    expect(new Date(transaction.date).toISOString()).toContain("2026-06-03")
  })

  it("detects likely subscriptions from the bundled sample statement", () => {
    const sample = readFileSync(
      join(process.cwd(), "public/samples/credit-card-statement-3-months.csv"),
      "utf8"
    )
    const parsed = parseCsv(sample)
    const transactions = normalizeTransactionRows({
      fallbackCurrency: "CAD",
      mapping: {
        merchant: "Description",
        transactionDate: "Transaction Date",
        amount: "Transaction Amount",
        account: "Card #",
      },
      rows: parsed.rows,
    })

    const candidates = detectMonthlySubscriptionCandidates(transactions)

    expect(getImportDateRangeSummary(transactions)).toMatchObject({
      daySpan: 88,
      hasEnoughRangeForMonthlyDetection: true,
    })
    expect(candidates.map((candidate) => candidate.suggestedName)).toEqual([
      "Spotify Canada Toronto",
      "Openrouter Inc New York",
      "Duolingo Super Pittsburgh",
      "Canva Pro Sydney",
    ])
    expect(candidates.every((candidate) => candidate.matchQuality === "likely")).toBe(
      true
    )
  })

  it("marks two monthly charges as possible", () => {
    const [candidate] = detectMonthlySubscriptionCandidates(
      normalizeTransactionRows({
        fallbackCurrency: "USD",
        mapping: {
          merchant: "Description",
          transactionDate: "Date",
          amount: "Amount",
        },
        rows: [
          { Date: "2026-01-10", Description: "Spotify USA", Amount: "-10.99" },
          { Date: "2026-02-09", Description: "Spotify USA", Amount: "-10.99" },
        ],
      })
    )

    expect(candidate).toMatchObject({
      suggestedName: "Spotify Usa",
      amount: 10.99,
      billingFrequency: "monthly",
      matchQuality: "possible",
    })
  })

  it("marks three stable monthly charges as likely", () => {
    const [candidate] = detectMonthlySubscriptionCandidates(
      normalizeTransactionRows({
        fallbackCurrency: "USD",
        mapping: {
          merchant: "Description",
          transactionDate: "Date",
          amount: "Amount",
        },
        rows: [
          { Date: "2026-01-03", Description: "Adobe Creative Cloud", Amount: "54.99" },
          { Date: "2026-02-04", Description: "Adobe Creative Cloud", Amount: "54.99" },
          { Date: "2026-03-04", Description: "Adobe Creative Cloud", Amount: "55.99" },
        ],
      })
    )

    expect(candidate.matchQuality).toBe("likely")
    expect(candidate.confidence).toBeGreaterThanOrEqual(0.9)
    expect(candidate.matchedTransactions).toHaveLength(3)
  })

  it("ignores one-off and unstable charges", () => {
    const candidates = detectMonthlySubscriptionCandidates(
      normalizeTransactionRows({
        fallbackCurrency: "USD",
        mapping: {
          merchant: "Description",
          transactionDate: "Date",
          amount: "Amount",
        },
        rows: [
          { Date: "2026-01-01", Description: "Coffee Shop", Amount: "4.50" },
          { Date: "2026-01-02", Description: "Coffee Shop", Amount: "7.25" },
          { Date: "2026-01-15", Description: "Hardware Store", Amount: "80.00" },
        ],
      })
    )

    expect(candidates).toEqual([])
  })

  it("warns when a detected subscription looks like an existing one", () => {
    const warning = getSubscriptionImportDuplicateWarning({
      candidate: {
        suggestedName: "Netflix",
        amount: 15.99,
        currency: "USD",
      },
      existingSubscriptions: [
        {
          id: "existing-1",
          name: "Netflix",
          cost: 16.49,
          currency: "USD",
          billingFrequency: "monthly",
        },
      ],
    })

    expect(warning).toBe("Looks like existing subscription: Netflix")
  })

  it("does not warn for different currencies or billing frequencies", () => {
    const warning = getSubscriptionImportDuplicateWarning({
      candidate: {
        suggestedName: "Netflix",
        amount: 15.99,
        currency: "USD",
      },
      existingSubscriptions: [
        {
          id: "existing-1",
          name: "Netflix",
          cost: 15.99,
          currency: "CAD",
          billingFrequency: "monthly",
        },
        {
          id: "existing-2",
          name: "Netflix",
          cost: 15.99,
          currency: "USD",
          billingFrequency: "yearly",
        },
      ],
    })

    expect(warning).toBeNull()
  })

  it("infers card details from account labels when the network is present", () => {
    expect(inferPaymentMethodFromAccountLabel("Visa ending 1234")).toEqual({
      name: "Visa ending 1234",
      type: "CREDIT_CARD",
      lastFour: "1234",
    })

    expect(inferPaymentMethodFromAccountLabel("Mastercard debit ...5678")).toEqual({
      name: "Mastercard ending 5678",
      type: "DEBIT_CARD",
      lastFour: "5678",
    })
  })

  it("does not infer a card network from last four digits alone", () => {
    expect(inferPaymentMethodFromAccountLabel("Account 1234")).toEqual({
      name: "Card ending 1234",
      type: "CREDIT_CARD",
      lastFour: "1234",
    })
  })

  it("infers non-card payment labels", () => {
    expect(inferPaymentMethodFromAccountLabel("PayPal balance")).toEqual({
      name: "PayPal",
      type: "PAYPAL",
      lastFour: null,
    })
  })

  it("flags transaction ranges that are too short for reliable monthly detection", () => {
    const summary = getImportDateRangeSummary(
      normalizeTransactionRows({
        fallbackCurrency: "USD",
        mapping: {
          merchant: "Description",
          transactionDate: "Date",
          amount: "Amount",
        },
        rows: [
          { Date: "2026-01-01", Description: "Netflix", Amount: "15.99" },
          { Date: "2026-01-31", Description: "Spotify", Amount: "10.99" },
        ],
      })
    )

    expect(summary).toMatchObject({
      daySpan: 30,
      hasEnoughRangeForMonthlyDetection: false,
    })
  })

  it("accepts wider transaction ranges for monthly detection", () => {
    const summary = getImportDateRangeSummary(
      normalizeTransactionRows({
        fallbackCurrency: "USD",
        mapping: {
          merchant: "Description",
          transactionDate: "Date",
          amount: "Amount",
        },
        rows: [
          { Date: "2026-01-01", Description: "Netflix", Amount: "15.99" },
          { Date: "2026-03-05", Description: "Spotify", Amount: "10.99" },
        ],
      })
    )

    expect(summary).toMatchObject({
      daySpan: 63,
      hasEnoughRangeForMonthlyDetection: true,
    })
  })
})
