import { parseCsv } from "@/lib/import-csv"

describe("CSV import parsing", () => {
  it("parses headers and rows", () => {
    expect(parseCsv("Date,Description,Amount\n2026-01-01,Netflix,-15.99")).toEqual({
      headers: ["Date", "Description", "Amount"],
      rows: [
        {
          Date: "2026-01-01",
          Description: "Netflix",
          Amount: "-15.99",
        },
      ],
    })
  })

  it("keeps commas inside quoted cells", () => {
    const parsed = parseCsv(
      'Date,Description,Amount\n2026-01-01,"APPLE.COM/BILL, CA",-9.99'
    )

    expect(parsed.rows[0].Description).toBe("APPLE.COM/BILL, CA")
  })

  it("unescapes doubled quotes inside quoted cells", () => {
    const parsed = parseCsv(
      'Date,Description,Amount\n2026-01-01,"Streaming ""Premium"" Plan",-12.99'
    )

    expect(parsed.rows[0].Description).toBe('Streaming "Premium" Plan')
  })

  it("supports quoted line breaks", () => {
    const parsed = parseCsv(
      'Date,Description,Amount\n2026-01-01,"Line one\nLine two",-12.99'
    )

    expect(parsed.rows).toHaveLength(1)
    expect(parsed.rows[0].Description).toBe("Line one\nLine two")
  })

  it("skips statement preface lines before the real header", () => {
    const parsed = parseCsv(
      "Following data is valid as of 20260831182703:\n\nItem #,Card #,Transaction Date,Posting Date,Transaction Amount,Description\n1,'4000000000001234',20260603,20260604,12.99,Example Merchant"
    )

    expect(parsed.headers).toEqual([
      "Item #",
      "Card #",
      "Transaction Date",
      "Posting Date",
      "Transaction Amount",
      "Description",
    ])
    expect(parsed.rows[0]).toMatchObject({
      "Item #": "1",
      "Transaction Date": "20260603",
      Description: "Example Merchant",
    })
  })
})
