import {
  detectMonthlySubscriptionCandidates,
  guessImportColumnMapping,
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
})
