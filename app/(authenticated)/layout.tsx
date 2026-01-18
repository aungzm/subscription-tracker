import type React from "react"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { ClientDashboardLayout } from "./client-layout"

// Define a type for the session user for clarity
interface SessionUser {
  id?: string | null
  name?: string | null
  email?: string | null
  image?: string | null
}

// Define the expected session structure from auth()
interface LayoutSession {
  user?: SessionUser | null
}

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session: LayoutSession | null = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  return (
    <ClientDashboardLayout session={session}>
      {children}
    </ClientDashboardLayout>
  )
}
