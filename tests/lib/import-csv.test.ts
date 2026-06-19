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
})
