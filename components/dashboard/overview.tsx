"use client"
import { useState, useEffect } from "react"
import { Calendar, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"

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
  
  // Helper to get color class based on category_color
  function getColorClass(colorHex?: string): string {
    if (!colorHex) return "bg-gray-500"
    
    // Map hex codes to Tailwind color classes based on your colorOptions palette
    const colorMap: { [key: string]: string } = {
      "#ef4444": "bg-red-500",
      "#f97316": "bg-orange-500",
      "#f59e0b": "bg-amber-500",
      "#eab308": "bg-yellow-500",
      "#84cc16": "bg-lime-500",
      "#22c55e": "bg-green-500",
      "#10b981": "bg-emerald-500",
      "#14b8a6": "bg-teal-500",
      "#06b6d4": "bg-cyan-500",
      "#0ea5e9": "bg-sky-500",
      "#3b82f6": "bg-blue-500",
      "#6366f1": "bg-indigo-500",
      "#8b5cf6": "bg-violet-500",
      "#a855f7": "bg-purple-500",
      "#d946ef": "bg-fuchsia-500",
      "#ec4899": "bg-pink-500",
      "#f43f5e": "bg-rose-500",
      "#6b7280": "bg-gray-500"
    }
    
    // Default fallback colors for common hex codes
    return colorMap[colorHex.toLowerCase()] || "bg-blue-500"
  }
  
  return (
    <div className="w-full max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-6">
      {/* Header with month navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Calendar className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-800">
            {monthName} {currentYear}
          </h2>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={prevMonth}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Previous month"
            disabled={isLoading}
          >
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <button 
            onClick={nextMonth}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Next month"
            disabled={isLoading}
          >
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </div>
      
      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
          <span className="ml-2 text-gray-600">Loading subscription data...</span>
        </div>
      )}
      
      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="text-red-600 underline mt-2"
          >
            Retry
          </button>
        </div>
      )}
      
      {/* Calendar grid */}
      {!isLoading && !error && (
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((wd) => (
            <div key={wd} className="font-medium text-center text-gray-500 py-2">
              {wd}
            </div>
          ))}
          
          {calendar.flat().map((cell, idx) =>
            cell ? (
              <div
                key={idx}
                className={`border rounded-lg p-1 min-h-16 flex flex-col relative cursor-pointer transition-all
                  ${cell.isToday ? "border-blue-600 border-2" : "border-gray-200 hover:border-blue-300"}
                  ${cell.subs.length > 0 ? "bg-blue-50" : ""}
                  ${selectedDay === cell.day ? "ring-2 ring-blue-500 shadow-sm" : ""}
                `}
                onClick={() => setSelectedDay(cell.day)}
              >
                <div className={`flex justify-center mb-1 ${cell.isToday ? "text-blue-600 font-bold" : "font-medium"}`}>
                  {cell.day}
                </div>
                
                {/* Show dots for subscriptions */}
                {cell.subs.length > 0 && (
                  <div className="flex justify-center space-x-1 mt-auto">
                    {cell.subs.slice(0, 3).map((sub, i) => (
                      <div 
                        key={i} 
                        className={`h-2 w-2 rounded-full ${getColorClass(sub.category_color)}`}
                      ></div>
                    ))}
                    {cell.subs.length > 3 && (
                      <div className="h-2 w-2 rounded-full bg-gray-400"></div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div key={idx} className="border border-gray-100 rounded-lg bg-gray-50 opacity-50"></div>
            )
          )}
        </div>
      )}
      
      {/* Subscription details */}
      {!isLoading && (
        <div className="mt-6">
          {selectedDay ? (
            <div className="border-t pt-4">
              <h3 className="text-lg font-medium text-gray-800 mb-3">
                Subscriptions on {monthName} {selectedDay}, {currentYear}
              </h3>
              {selectedDaySubs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedDaySubs.map((sub, i) => (
                    <div 
                      key={i}
                      className="flex justify-between p-3 rounded-lg border border-gray-200 bg-white shadow-sm"
                    >
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-2 ${getColorClass(sub.category_color)}`}></div>
                        <span className="font-medium">{sub.name}</span>
                        {sub.category && (
                          <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
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
                <p className="text-gray-500">No subscriptions on this day</p>
              )}
            </div>
          ) : (
            <div className="border-t pt-4 text-gray-500 text-center">
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