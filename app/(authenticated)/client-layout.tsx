"use client"

import type React from "react"
import { DashboardNav } from "@/components/dashboard/dashboard-nav"
import { UserNav } from "@/components/dashboard/user-nav"
import { ModeToggle } from "@/components/mode-toggle"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

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
  if (!session?.user) {
    return null
  }

  return (
    <SidebarProvider
      defaultOpen
      style={
        {
          "--sidebar-width-icon": "4rem",
        } as React.CSSProperties
      }
    >
      <DashboardNav />
      <SidebarInset>
        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-3 border-b border-border/60 bg-background/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 md:px-6">
          <div className="min-w-0 flex-1">
            <p className="font-heading text-sm font-medium">Dashboard</p>
            <p className="text-xs text-muted-foreground">
              Monitor subscriptions, renewals, and spending.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <UserNav user={session.user} />
          </div>
        </header>
        <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
