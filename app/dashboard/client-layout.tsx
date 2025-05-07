"use client"

import type React from "react"
import { useState } from "react"
import { DashboardNav } from "@/components/dashboard/dashboard-nav"
import { UserNav } from "@/components/dashboard/user-nav"
import { ModeToggle } from "@/components/mode-toggle"
import { cn } from "@/lib/utils"

// Define a type for the session user for clarity
interface SessionUser {
  id?: string | null
  name?: string | null
  email?: string | null
  image?: string | null
}

// Define the expected session structure
interface LayoutSession {
  user?: SessionUser | null
}

export function ClientDashboardLayout({
  session,
  children,
}: {
  session: LayoutSession | null
  children: React.ReactNode
}) {
  const [isExpanded, setIsExpanded] = useState(true)
  const toggleSidebar = () => setIsExpanded(!isExpanded)

  // Ensure user exists before rendering UserNav
  if (!session?.user) {
    return null 
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center flex-end ml-1 mr-8">
          <div className="mr-4 hidden md:flex">
            <a href="/dashboard" className="mr-6 flex items-center space-x-2">
              <span className={cn("font-bold ml-4", !isExpanded && "sr-only")}>
                SubTracker
              </span>
            </a>
          </div>
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <div className="w-full flex-1 md:w-auto md:flex-none">
              <div className="hidden md:block">
                {/* Search component would go here */}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ModeToggle />
              <UserNav user={session.user} />
            </div>
          </div>
        </div>
      </header>
      <div
        className={cn(
          "flex-1 md:grid",
          isExpanded
            ? "md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]"
            : "md:grid-cols-[64px_1fr]",
        )}
      >
        <aside className="hidden border-r bg-background md:block">
          <DashboardNav
            isExpanded={isExpanded}
            toggleSidebar={toggleSidebar}
          />
        </aside>
        <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
      </div>
    </div>
  )
}
