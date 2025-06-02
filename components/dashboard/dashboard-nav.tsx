"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { BarChart3, CreditCard, Home, Settings, Users, Menu } from "lucide-react"

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: Home,
  },
  {
    title: "Subscriptions",
    href: "/subscriptions",
    icon: CreditCard,
  },
  {
    title: "Analytics",
    href: "/analytics",
    icon: BarChart3,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
]

interface DashboardNavProps {
  isExpanded: boolean
  toggleSidebar: () => void
}

export function DashboardNav({
  isExpanded,
  toggleSidebar,
}: DashboardNavProps) {
  const pathname = usePathname()
  return (
    <aside
      className={cn(
        "h-screen p-2 transition-all duration-300 flex flex-col",
        // Use the isExpanded prop to adjust the sidebar width.
        isExpanded ? "w-64" : "w-106"
      )}
    >
      <button
        onClick={toggleSidebar}
        className="mb-4 rounded p-2 hover:bg-gray-200 transition-all"
      >
        <Menu className="h-6 w-6" />
      </button>
      <nav className="flex flex-col gap-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:text-primary",
                isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {isExpanded && <span>{item.title}</span>}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
