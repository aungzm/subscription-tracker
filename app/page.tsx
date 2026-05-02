import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ArrowRight,
  BarChart3,
  Bell,
  Calendar,
  CreditCard,
  ShieldCheck,
  Tags,
  Wallet,
} from "lucide-react"

export default async function Home() {
  const session = await auth()

  if (session) {
    redirect("/dashboard")
  }

  const features = [
    {
      icon: CreditCard,
      title: "Track subscriptions",
      description: "Keep every subscription, amount, and billing cadence in one organized workspace.",
    },
    {
      icon: BarChart3,
      title: "Spending analytics",
      description: "Review monthly and yearly trends to see where recurring costs are growing.",
    },
    {
      icon: Bell,
      title: "Custom reminders",
      description: "Set up renewal notifications before charges hit your card or account.",
    },
    {
      icon: Tags,
      title: "Category system",
      description: "Group subscriptions by category so your recurring stack stays readable.",
    },
    {
      icon: Calendar,
      title: "Renewal visibility",
      description: "Spot upcoming renewals at a glance instead of getting surprised later.",
    },
    {
      icon: Wallet,
      title: "Payment mapping",
      description: "See which card or payment method is attached to each active service.",
    },
  ]

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(18,184,134,0.16),transparent_24%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--sidebar)))] text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <CreditCard className="size-4" />
            </div>
            <div>
              <p className="font-heading text-base font-semibold">SubTracker</p>
              <p className="text-xs text-muted-foreground">Subscription command center</p>
            </div>
          </Link>
          <nav className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:px-8 md:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="space-y-6">
            <Badge variant="secondary" className="w-fit">
              Designed for recurring spend clarity
            </Badge>
            <div className="max-w-2xl space-y-4">
              <h1 className="font-heading text-5xl font-semibold leading-tight lg:text-6xl">
                Take control of subscriptions before they take control of your budget.
              </h1>
              <p className="text-lg text-muted-foreground md:text-xl">
                Track active services, monitor renewal timing, and understand recurring costs through a cleaner dashboard built for focus.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/register">
                <Button size="lg" className="w-full gap-2 sm:w-auto">
                  Create Account
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Sign In
                </Button>
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="bg-card/70">
                <CardHeader>
                  <CardDescription>Monthly visibility</CardDescription>
                  <CardTitle className="text-3xl">$239.88</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-sm text-muted-foreground">
                  Example projected yearly cost from active recurring services.
                </CardContent>
              </Card>
              <Card className="bg-card/70">
                <CardHeader>
                  <CardDescription>Upcoming renewals</CardDescription>
                  <CardTitle className="text-3xl">7 days</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-sm text-muted-foreground">
                  Stay ahead of charges with reminders and renewal tracking.
                </CardContent>
              </Card>
              <Card className="bg-card/70">
                <CardHeader>
                  <CardDescription>Organized accounts</CardDescription>
                  <CardTitle className="text-3xl">1 place</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-sm text-muted-foreground">
                  One workspace for subscriptions, categories, and payment methods.
                </CardContent>
              </Card>
            </div>
          </div>

          <Card className="overflow-hidden border-border/70 bg-card/85 shadow-2xl">
            <CardHeader className="border-b border-border/60">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>Workspace preview</CardTitle>
                  <CardDescription>How SubTracker organizes your recurring spend</CardDescription>
                </div>
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/12 text-primary">
                  <ShieldCheck className="size-4" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="bg-muted/30">
                  <CardHeader>
                    <CardDescription>Streaming stack</CardDescription>
                    <CardTitle>$29.97</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0 text-sm text-muted-foreground">
                    <div className="flex items-center justify-between rounded-lg bg-background/70 px-3 py-2">
                      <span>Netflix</span>
                      <span>$15.99</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-background/70 px-3 py-2">
                      <span>Spotify</span>
                      <span>$10.99</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-background/70 px-3 py-2">
                      <span>Apple TV+</span>
                      <span>$2.99</span>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardHeader>
                    <CardDescription>Renewal queue</CardDescription>
                    <CardTitle>Next 7 days</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0 text-sm text-muted-foreground">
                    <div className="rounded-lg border border-border/60 bg-background/70 px-3 py-2">
                      Netflix renews on May 28
                    </div>
                    <div className="rounded-lg border border-border/60 bg-background/70 px-3 py-2">
                      Notion renews on May 30
                    </div>
                    <div className="rounded-lg border border-border/60 bg-background/70 px-3 py-2">
                      Domain renews on June 1
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <p className="text-sm font-medium">Why teams and individuals use it</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  SubTracker turns scattered recurring charges into a readable, searchable, and proactive workflow.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-4 md:px-8 md:py-10">
          <div className="mb-8">
            <h2 className="font-heading text-3xl font-semibold">Everything you need to manage subscriptions</h2>
            <p className="mt-2 text-muted-foreground">
              Purpose-built tools for understanding and reducing recurring spend.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} className="bg-card/70">
                <CardHeader>
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/12 text-primary">
                    <feature.icon className="size-4" />
                  </div>
                  <CardTitle className="mt-3">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-16 text-center md:px-8">
          <Card className="bg-card/80">
            <CardHeader>
              <CardTitle className="text-3xl">Start tracking today</CardTitle>
              <CardDescription>
                Create a workspace, add your services, and get a clearer view of recurring spend.
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-2">
              <Link href="/register">
                <Button size="lg" className="gap-2">
                  Create Account
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  )
}
