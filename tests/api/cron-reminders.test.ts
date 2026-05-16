import { GET } from "@/app/api/cron/reminders/route"
import { runReminderDispatch } from "@/lib/reminder-dispatch"
import { NextResponse } from "next/server"

jest.mock("@/lib/reminder-dispatch", () => ({
  runReminderDispatch: jest.fn(),
}))

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({ body, init })),
  },
}))

const mockedRunReminderDispatch =
  runReminderDispatch as jest.MockedFunction<typeof runReminderDispatch>

describe("GET /api/cron/reminders", () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = {
      ...originalEnv,
      CRON_SECRET: "top-secret",
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it("returns 401 for missing authorization", async () => {
    const req = new Request("http://localhost/api/cron/reminders")
    const res = (await GET(req)) as any

    expect(res.body).toEqual({ error: "Unauthorized" })
    expect(res.init).toEqual({ status: 401 })
  })

  it("runs the dispatcher for authorized cron calls", async () => {
    mockedRunReminderDispatch.mockResolvedValueOnce({
      scanned: 4,
      sent: 3,
      failed: 1,
      webhookFailures: 0,
    })

    const req = new Request("http://localhost/api/cron/reminders", {
      headers: {
        Authorization: "Bearer top-secret",
      },
    })

    const res = (await GET(req)) as any

    expect(mockedRunReminderDispatch).toHaveBeenCalled()
    expect(res.body).toEqual({
      success: true,
      scanned: 4,
      sent: 3,
      failed: 1,
      webhookFailures: 0,
    })
  })
})
