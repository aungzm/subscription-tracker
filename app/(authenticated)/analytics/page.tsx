"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { MonthlyTrend } from "@/components/analytics/monthly-trend"
import { YearlyTrend } from "@/components/analytics/yearly-trend"

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

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/analytics/details')

        if (!response.ok) {
          throw new Error(`Error: ${response.status}`)
        }

        const analyticsData = await response.json()
        setData(analyticsData)
      } catch (err) {
        console.error('Failed to fetch analytics data:', err)
        setError('Failed to load analytics data. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Helper function to format currency
  const formatCurrency = (value: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  // Determine what to display for largest expense based on billing frequency
  const formatLargestExpenseDetails = (expense: LargestExpense | null) => {
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

  const largestExpense = data?.largestExpense
    ? formatLargestExpenseDetails(data.largestExpense)
    : { name: 'Loading...', cost: '' }

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
                {loading
                  ? <Skeleton className="h-8 w-[100px]" />
                  : error
                    ? "Error loading data"
                    : formatCurrency(data?.averageMonthly.value || 0, data?.averageMonthly.currency)
                }
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
                {loading
                  ? <Skeleton className="h-8 w-[100px]" />
                  : error
                    ? "Error loading data"
                    : formatCurrency(data?.averageYearly.value || 0, data?.averageYearly.currency)
                }
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
                {loading ? <Skeleton className="h-8 w-[120px]" /> : error ? "Error" : largestExpense.name}
              </div>
              <p className="text-xs text-muted-foreground">
                {loading ? <Skeleton className="h-4 w-[100px] mt-1" /> : error ? "Error loading data" : largestExpense.cost}
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
              <MonthlyTrend />
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
              <YearlyTrend />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
