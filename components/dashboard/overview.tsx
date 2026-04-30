"use client"
import { useState, useEffect } from "react"
import { Calendar, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

// Define types for our API response
type SubscriptionDate = {
  id: string
  name: string
  billingFrequency: string
  cost: number
  currency: string
  category?: string
  category_color?: string
  sub_dates: string[]
}

type ApiResponse = {
  overview: SubscriptionDate[]
}

// Mapped subscription dates by date string
type MappedSubscriptions = {
  [date: string]: Array<{
    id: string
    name: string
    cost: number
    currency: string
    category?: string
    category_color?: string
  }>
}

export function Overview() {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1) // API expects 1-indexed months
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [subscriptionData, setSubscriptionData] = useState<MappedSubscriptions>({})
  
  // For display, we need 0-indexed month
  const displayMonth = currentMonth - 1
  
  // Fetch subscription data when month/year changes
  useEffect(() => {
    async function fetchSubscriptionDates() {
      setIsLoading(true)
      setError(null)
      
      try {
        const response = await fetch(`/api/subscriptions/dates?year=${currentYear}&month=${currentMonth}`)
        
        if (!response.ok) {
          throw new Error(`Error fetching subscription data: ${response.status}`)
        }
        
        const data: ApiResponse = await response.json()
        
        // Map subscriptions by date for easier lookup
        const mappedData: MappedSubscriptions = {}
        
        data.overview.forEach(sub => {
          sub.sub_dates.forEach(dateStr => {
            if (!mappedData[dateStr]) {
              mappedData[dateStr] = []
            }
            
            mappedData[dateStr].push({
              id: sub.id,
              name: sub.name,
              cost: sub.cost,
              currency: sub.currency,
              category: sub.category,
              category_color: sub.category_color
            })
          })
        })
        
        setSubscriptionData(mappedData)
      } catch (err) {
        console.error("Failed to fetch subscription data:", err)
        setError("Failed to load subscription data. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchSubscriptionDates()
  }, [currentYear, currentMonth])
  
  const daysInMonth = getDaysInMonth(currentYear, displayMonth)
  const firstDayOfWeek = getFirstDayOfWeek(currentYear, displayMonth)
  
  const monthName = new Date(currentYear, displayMonth).toLocaleString("default", { month: "long" })
  
  // Navigate to previous month
  const prevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
    setSelectedDay(null)
  }
  
  // Navigate to next month
  const nextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
    setSelectedDay(null)
  }
  
  // Build calendar grid
  const calendar = []
  let day = 1 - firstDayOfWeek // Start from the first cell (may be negative)
  for (let week = 0; week < 6; week++) {
    const weekRow = []
    for (let d = 0; d < 7; d++) {
      if (day > 0 && day <= daysInMonth) {
        // Format date for subscription matching
        const dayStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`
        // Find subscriptions for this day
        const subs = subscriptionData[dayStr] || []
        
        // Check if this is today
        const isToday = 
          today.getDate() === day && 
          today.getMonth() === displayMonth && 
          today.getFullYear() === currentYear
          
        weekRow.push({ day, subs, isToday })
      } else {
        weekRow.push(null)
      }
      day++
    }
    calendar.push(weekRow)
    
    // Stop generating empty weeks
    if (day > daysInMonth && week >= 3) break
  }
  
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  
  // Get selected day subscriptions
  const selectedDayStr = selectedDay ? 
    `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}` : null
  
  const selectedDaySubs = selectedDayStr ? subscriptionData[selectedDayStr] || [] : []
  
  function formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }
  
  return (
    <div className="w-full space-y-5 rounded-xl border border-border/60 bg-muted/20 p-4 shadow-sm">
      {/* Header with month navigation */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/12 text-primary">
            <Calendar className="h-4 w-4" />
          </div>
          <h2 className="font-heading text-2xl font-semibold">
            {monthName} {currentYear}
          </h2>
        </div>
        <div className="flex space-x-2">
          <Button 
            onClick={prevMonth}
            variant="ghost"
            size="icon-sm"
            aria-label="Previous month"
            disabled={isLoading}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            onClick={nextMonth}
            variant="ghost"
            size="icon-sm"
            aria-label="Next month"
            disabled={isLoading}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center rounded-xl border border-border/60 bg-background/60 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-sm text-muted-foreground">
            Loading subscription data...
          </span>
        </div>
      )}
      
      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 text-sm underline"
          >
            Retry
          </button>
        </div>
      )}
      
      {/* Calendar grid */}
      {!isLoading && !error && (
        <div className="grid grid-cols-7 gap-2 rounded-xl border border-border/60 bg-background/70 p-3">
          {weekDays.map((wd) => (
            <div key={wd} className="py-2 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {wd}
            </div>
          ))}
          
          {calendar.flat().map((cell, idx) =>
            cell ? (
              <div
                key={idx}
                className={`relative flex min-h-20 cursor-pointer flex-col rounded-lg border p-2 transition-all
                  ${cell.isToday ? "border-primary/80 shadow-[0_0_0_1px_hsl(var(--primary)/0.18)]" : "border-border/70"}
                  ${cell.subs.length > 0 ? "bg-primary/8" : "bg-background/40 hover:bg-muted/50"}
                  ${selectedDay === cell.day ? "bg-primary/12 ring-2 ring-primary/50" : ""}
                `}
                onClick={() => setSelectedDay(cell.day)}
              >
                <div className={`mb-1 flex justify-center text-sm ${cell.isToday ? "font-semibold text-primary" : "font-medium text-foreground"}`}>
                  {cell.day}
                </div>
                
                {/* Show dots for subscriptions */}
                {cell.subs.length > 0 && (
                  <div className="flex justify-center space-x-1 mt-auto">
                    {cell.subs.slice(0, 3).map((sub, i) => (
                      <div 
                        key={i} 
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: sub.category_color || "currentColor" }}
                      />
                    ))}
                    {cell.subs.length > 3 && (
                      <div className="h-2 w-2 rounded-full bg-muted-foreground/60"></div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div key={idx} className="rounded-lg border border-border/40 bg-muted/20 opacity-50"></div>
            )
          )}
        </div>
      )}
      
      {/* Subscription details */}
      {!isLoading && (
        <div>
          {selectedDay ? (
            <div className="rounded-xl border border-border/60 bg-background/70 p-4">
              <h3 className="mb-3 font-heading text-lg font-medium">
                Subscriptions on {monthName} {selectedDay}, {currentYear}
              </h3>
              {selectedDaySubs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedDaySubs.map((sub, i) => (
                    <div 
                      key={i}
                      className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 p-3"
                    >
                      <div className="flex items-center">
                        <div
                          className="mr-2 h-3 w-3 rounded-full"
                          style={{ backgroundColor: sub.category_color || "currentColor" }}
                        />
                        <span className="font-medium">{sub.name}</span>
                        {sub.category && (
                          <span className="ml-2 rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                            {sub.category}
                          </span>
                        )}
                      </div>
                      <div className="font-semibold">
                        {formatCurrency(sub.cost, sub.currency)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No subscriptions on this day</p>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/60 bg-background/40 px-4 py-6 text-center text-sm text-muted-foreground">
              Select a day to view subscription details
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Helper to get days in a month
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

// Helper to get the weekday of the first day of the month (0 = Sunday)
function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}
