import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MonthlyTrend } from "@/components/analytics/monthly-trend"
import { YearlyTrend } from "@/components/analytics/yearly-trend"
import { cookies, headers } from "next/headers"

// Type definitions
type LargestExpense = {
  id: string
  name: string
  cost: number
  currency: string
  billingFrequency: string
  normalizedMonthlyCost: number
  category: {
    id: string
    name: string
    color: string
  } | null
}

type AnalyticsData = {
  averageMonthly: {
    value: number
    currency: string
  }
  averageYearly: {
    value: number
    currency: string
  }
  largestExpense: LargestExpense | null
}

type CategoryMeta = {
  id: string
  name: string
  color: string
}

type MonthlyDataPoint = {
  name: string
  total: number
  [key: string]: string | number
}

type MonthlyTrendData = {
  years: number[]
  monthlyData: MonthlyDataPoint[]
  categories: CategoryMeta[]
}

type YearlyDataPoint = {
  year: number
  total: number
  [key: string]: string | number
}

type YearlyTrendData = {
  yearlyData: YearlyDataPoint[]
  categories: CategoryMeta[]
}

async function getAnalyticsData(): Promise<AnalyticsData> {
  const cookieStore = await cookies()
  const cookie = cookieStore.toString()

  const host = (await headers()).get("host")
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https"
  const url = `${protocol}://${host}/api/analytics/details`

  const res = await fetch(url, {
    headers: { cookie },
    next: { revalidate: 180, tags: ["analytics"] },
  })

  if (!res.ok) throw new Error("Failed to fetch analytics data")
  return res.json()
}

async function getMonthlyTrendData(): Promise<MonthlyTrendData> {
  const cookieStore = await cookies()
  const cookie = cookieStore.toString()

  const host = (await headers()).get("host")
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https"
  const currentYear = new Date().getFullYear()
  const url = `${protocol}://${host}/api/analytics/monthly?year=${currentYear}`

  const res = await fetch(url, {
    headers: { cookie },
    next: { revalidate: 180, tags: ["analytics"] },
  })

  if (!res.ok) throw new Error("Failed to fetch monthly trend data")
  return res.json()
}

async function getYearlyTrendData(): Promise<YearlyTrendData> {
  const cookieStore = await cookies()
  const cookie = cookieStore.toString()

  const host = (await headers()).get("host")
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https"
  const url = `${protocol}://${host}/api/analytics/yearly`

  const res = await fetch(url, {
    headers: { cookie },
    next: { revalidate: 180, tags: ["analytics"] },
  })

  if (!res.ok) throw new Error("Failed to fetch yearly trend data")
  return res.json()
}

// Helper function to format currency
function formatCurrency(value: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

// Determine what to display for largest expense based on billing frequency
function formatLargestExpenseDetails(expense: LargestExpense | null) {
  if (!expense) return { name: 'No subscriptions', cost: 'N/A' }

  let costDisplay = ''
  switch (expense.billingFrequency.toLowerCase()) {
    case 'weekly':
      costDisplay = `${formatCurrency(expense.cost, expense.currency)} per week`
      break
    case 'monthly':
      costDisplay = `${formatCurrency(expense.cost, expense.currency)} per month`
      break
    case 'yearly':
      costDisplay = `${formatCurrency(expense.cost, expense.currency)} per year`
      break
    case 'one-time':
      costDisplay = `${formatCurrency(expense.cost, expense.currency)} one-time`
      break
    default:
      costDisplay = formatCurrency(expense.cost, expense.currency)
  }

  return { name: expense.name, cost: costDisplay }
}

export default async function AnalyticsPage() {
  const [data, monthlyData, yearlyData] = await Promise.all([
    getAnalyticsData(),
    getMonthlyTrendData(),
    getYearlyTrendData(),
  ])
  const largestExpense = formatLargestExpenseDetails(data.largestExpense)

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
      </div>

      {/* Overview Section */}
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Monthly</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(data.averageMonthly.value, data.averageMonthly.currency)}
              </div>
              <p className="text-xs text-muted-foreground">
                Your subscription average over past 12 months
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Yearly</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(data.averageYearly.value, data.averageYearly.currency)}
              </div>
              <p className="text-xs text-muted-foreground">
                Your subscription average over the years
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Largest Expense</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {largestExpense.name}
              </div>
              <p className="text-xs text-muted-foreground">
                {largestExpense.cost}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Trend</CardTitle>
            </CardHeader>
            <CardContent className="pl-2 mt-[-32px]">
              <MonthlyTrend initialData={monthlyData} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Yearly Trend</CardTitle>
              <CardDescription>
                Your subscription spending over the years
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <YearlyTrend initialData={yearlyData} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
