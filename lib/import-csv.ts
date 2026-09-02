import type { RawTransactionRow } from "@/lib/import-detection"

export type ParsedCsv = {
  headers: string[]
  rows: RawTransactionRow[]
}

function parseCsvLine(line: string) {
  const cells: string[] = []
  let current = ""
  let insideQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const nextChar = line[index + 1]

    if (char === '"' && nextChar === '"' && insideQuotes) {
      current += '"'
      index += 1
      continue
    }

    if (char === '"') {
      insideQuotes = !insideQuotes
      continue
    }

    if (char === "," && !insideQuotes) {
      cells.push(current.trim())
      current = ""
      continue
    }

    current += char
  }

  cells.push(current.trim())
  return cells
}

function splitCsvRows(text: string) {
  const rows: string[] = []
  let current = ""
  let insideQuotes = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const nextChar = text[index + 1]

    if (char === '"' && nextChar === '"' && insideQuotes) {
      current += char + nextChar
      index += 1
      continue
    }

    if (char === '"') {
      insideQuotes = !insideQuotes
    }

    if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (current.trim().length > 0) {
        rows.push(current)
      }
      current = ""

      if (char === "\r" && nextChar === "\n") {
        index += 1
      }
      continue
    }

    current += char
  }

  if (current.trim().length > 0) {
    rows.push(current)
  }

  return rows
}

export function parseCsv(text: string): ParsedCsv {
  const lines = splitCsvRows(text.replace(/^\uFEFF/, ""))

  if (lines.length === 0) {
    return { headers: [], rows: [] }
  }

  const headerIndex = lines.findIndex(
    (line) => parseCsvLine(line).filter(Boolean).length > 1
  )

  if (headerIndex === -1) {
    return { headers: [], rows: [] }
  }

  const headers = parseCsvLine(lines[headerIndex]).map((header) => header.trim())
  const rows = lines.slice(headerIndex + 1).map((line) => {
    const cells = parseCsvLine(line)
    return headers.reduce<RawTransactionRow>((row, header, index) => {
      row[header] = cells[index] ?? ""
      return row
    }, {})
  })

  return { headers, rows }
}
