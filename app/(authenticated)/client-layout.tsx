"use client"

import type React from "react"
import { DashboardNav } from "@/components/dashboard/dashboard-nav"
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
          "--sidebar-width-icon": "4.5rem",
        } as React.CSSProperties
      }
    >
      <DashboardNav user={session.user} />
      <SidebarInset>
        <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
