import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ArrowRight,
  Bell,
  CreditCard,
  BarChart3,
  Tags,
  Calendar,
  Wallet
} from "lucide-react"

export default async function Home() {
  const session = await auth()

  if (session) {
    redirect("/dashboard")
  }

  const features = [
    {
      icon: CreditCard,
      title: "Track Subscriptions",
      description: "Add and manage all your subscriptions with costs, billing cycles, and renewal dates."
    },
    {
      icon: BarChart3,
      title: "Spending Analytics",
      description: "View monthly and yearly spending trends with interactive charts."
    },
    {
      icon: Bell,
      title: "Custom Notifications",
      description: "Set up email or webhook reminders before renewal dates."
    },
    {
      icon: Tags,
      title: "Categories",
      description: "Organize subscriptions with custom color-coded categories."
    },
    {
      icon: Calendar,
      title: "Upcoming Renewals",
      description: "See which subscriptions are renewing soon at a glance."
    },
    {
      icon: Wallet,
      title: "Payment Methods",
      description: "Track which payment method is used for each subscription."
    }
  ]

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-8">
          <Link href="/" className="flex items-center gap-2">
            <CreditCard className="h-6 w-6" />
            <span className="text-xl font-bold">SubTracker</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/register">
              <Button>Sign Up</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="container mx-auto px-4 md:px-8 py-16 md:py-24 lg:py-32">
          <div className="mx-auto max-w-3xl text-center space-y-6">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Take control of your subscriptions
            </h1>
            <p className="text-lg text-muted-foreground md:text-xl max-w-2xl mx-auto">
              Track spending, get renewal reminders, and visualize where your money goes.
              All your subscriptions organized in one place.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link href="/register">
                <Button size="lg" className="w-full sm:w-auto gap-2">
                  Get Started Free
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 md:px-8 py-16 border-t">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight">Features</h2>
            <p className="text-muted-foreground mt-2">Everything you need to manage your subscriptions</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            {features.map((feature) => (
              <Card key={feature.title} className="border bg-card">
                <CardHeader className="pb-3">
                  <feature.icon className="h-8 w-8 mb-2" />
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 md:px-8 py-16 border-t">
          <div className="mx-auto max-w-2xl text-center space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Start tracking today</h2>
            <p className="text-muted-foreground">
              Create a free account and get a clear view of your subscription spending.
            </p>
            <Link href="/register">
              <Button size="lg" className="mt-2 gap-2">
                Create Account
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 md:px-8 text-center text-sm text-muted-foreground">
          SubTracker - Subscription Management
        </div>
      </footer>
    </div>
  )
}
