"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, ChevronLeft, ChevronRight, CreditCard, Home, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"

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

export function DashboardNav() {
  const pathname = usePathname()
  const { state, toggleSidebar } = useSidebar()

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="gap-3 px-3 py-4">
        <div className="flex items-center justify-between gap-2 group-data-[collapsible=icon]:justify-center">
          <Link
            href="/dashboard"
            className="flex min-w-0 items-center gap-3 rounded-md text-sm font-semibold tracking-tight"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <CreditCard className="size-4" />
            </div>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <div className="font-heading text-sm">SubTracker</div>
              <div className="truncate text-xs text-sidebar-foreground/70">
                Subscription hub
              </div>
            </div>
          </Link>
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0 group-data-[collapsible=icon]:hidden"
            onClick={toggleSidebar}
            aria-label={state === "expanded" ? "Collapse sidebar" : "Expand sidebar"}
          >
            {state === "expanded" ? (
              <ChevronLeft className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </Button>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={item.title}
                    size="lg"
                    className="group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-xl"
                  >
                    <Link href={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
          )
        })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
