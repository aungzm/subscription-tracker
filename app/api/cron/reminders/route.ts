import { NextResponse } from "next/server"
import { runReminderDispatch } from "@/lib/reminder-dispatch"

function isAuthorized(request: Request) {
  const expectedSecret = process.env.CRON_SECRET

  if (!expectedSecret) {
    return false
  }

  const authHeader = request.headers.get("authorization")
  return authHeader === `Bearer ${expectedSecret}`
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const result = await runReminderDispatch()
  return NextResponse.json({ success: true, ...result })
}
