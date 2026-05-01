import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { LoginForm } from "@/components/auth/login-form"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CreditCard, ShieldCheck, Sparkles } from "lucide-react"

export default async function LoginPage() {
  const session = await auth()

  if (session) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(18,184,134,0.18),transparent_28%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--sidebar)))]">
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
            Secure sign in
          </Badge>
        </div>

        <div className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="hidden space-y-6 lg:block">
            <Badge variant="secondary" className="w-fit">
              Radix Nova preset
            </Badge>
            <div className="max-w-xl space-y-4">
              <h1 className="font-heading text-5xl font-semibold leading-tight">
                Keep every renewal, payment, and reminder in one focused workspace.
              </h1>
              <p className="text-lg text-muted-foreground">
                Track subscription costs, monitor upcoming charges, and review spending trends from a cleaner dashboard.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  icon: ShieldCheck,
                  title: "Protected access",
                  description: "Sign in securely and jump back into your private billing workspace.",
                },
                {
                  icon: Sparkles,
                  title: "Focused overview",
                  description: "See the important subscription signals without digging through clutter.",
                },
                {
                  icon: CreditCard,
                  title: "Better visibility",
                  description: "Watch spending, renewals, and service changes in one place.",
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

          <Card className="mx-auto w-full max-w-md bg-card/85 shadow-xl">
            <CardHeader className="space-y-2">
              <CardTitle className="text-2xl">Welcome back</CardTitle>
              <CardDescription>
                Enter your email and password to return to your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <LoginForm />
              <div className="space-y-3 text-center text-sm text-muted-foreground">
                <p>
                  <Link href="/forgot-password" className="underline underline-offset-4 hover:text-primary">
                    Forgot your password?
                  </Link>
                </p>
                <p>
                  Don&apos;t have an account?{" "}
                  <Link href="/register" className="font-medium text-foreground hover:text-primary">
                    Sign up
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
