import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { RegisterForm } from "@/components/auth/register-form"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BellRing, CreditCard, LineChart, UserPlus } from "lucide-react"

export default async function RegisterPage() {
  const session = await auth()

  if (session) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(18,184,134,0.16),transparent_24%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--sidebar)))]">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 md:px-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <CreditCard className="size-4" />
            </div>
            <div>
              <p className="font-heading text-base font-semibold">SubTracker</p>
              <p className="text-xs text-muted-foreground">Subscription command center</p>
            </div>
          </Link>
          <Badge variant="outline" className="hidden sm:inline-flex">
            Create your workspace
          </Badge>
        </div>

        <div className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[0.95fr_1.05fr]">
          <Card className="order-2 mx-auto w-full max-w-md bg-card/85 shadow-xl lg:order-1">
            <CardHeader className="space-y-2">
              <CardTitle className="text-2xl">Create an account</CardTitle>
              <CardDescription>
                Set up your workspace and start organizing recurring spending.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <RegisterForm />
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="font-medium text-foreground hover:text-primary">
                  Sign in
                </Link>
              </p>
            </CardContent>
          </Card>

          <div className="order-1 space-y-6 lg:order-2">
            <Badge variant="secondary" className="w-fit">
              Built for recurring spend
            </Badge>
            <div className="max-w-xl space-y-4">
              <h1 className="font-heading text-5xl font-semibold leading-tight">
                Create a calmer subscription workflow from day one.
              </h1>
              <p className="text-lg text-muted-foreground">
                Add services, group them by category, and stay ahead of upcoming renewals with a dashboard built for clarity.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  icon: UserPlus,
                  title: "Quick setup",
                  description: "Create your account and begin tracking in minutes.",
                },
                {
                  icon: BellRing,
                  title: "Smarter reminders",
                  description: "Get notified before charges hit your account.",
                },
                {
                  icon: LineChart,
                  title: "Cleaner reporting",
                  description: "Understand recurring costs with better month-to-month context.",
                },
              ].map((item) => (
                <Card key={item.title} className="bg-card/70">
                  <CardHeader>
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/12 text-primary">
                      <item.icon className="size-4" />
                    </div>
                    <CardTitle className="mt-3">{item.title}</CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
