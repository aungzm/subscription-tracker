import { runReminderDispatch } from "@/lib/reminder-dispatch"

async function main() {
  const result = await runReminderDispatch()
  console.log(JSON.stringify(result, null, 2))
}

main().catch((error) => {
  console.error("Reminder dispatch failed:", error)
  process.exit(1)
})
