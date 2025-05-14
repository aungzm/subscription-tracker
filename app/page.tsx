import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, CalendarRange, CreditCard, LineChart, ReceiptText} from "lucide-react"

export default async function Home() {
  const session = await auth()

  if (session) {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 max-w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 mr-4 ml-4">
        <div className="flex h-14 items-center w-full">
          <div className="mr-4 flex">
            <Link href="/" className="mr-6 flex items-center space-x-2">
              <CreditCard className="h-6 w-6" />
              <span className="font-bold">SubTracker</span>
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-4">
            <nav className="flex items-center space-x-2">
              <Link href="/login" passHref>
                <Button variant="ghost" size="sm">
                  Login
                </Button>
              </Link>
              <Link href="/register" passHref>
                <Button size="sm">Sign Up</Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="mr-4 ml-4 px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                    Never forget a subscription again
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    Track all your subscriptions in one place. Get reminders before billing dates and visualize your
                    spending.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Link href="/register" passHref>
                    <Button size="lg" className="gap-1.5">
                      Get Started
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="flex justify-center">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader className="space-y-1">
                      <CardTitle className="text-xl">Track Expenses</CardTitle>
                      <CardDescription>Monitor your monthly and yearly spending</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ReceiptText className="h-12 w-12 text-primary" />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="space-y-1">
                      <CardTitle className="text-xl">Get Reminders</CardTitle>
                      <CardDescription>Never miss a payment deadline</CardDescription>
                    </CardHeader>
                    <CardContent className="mt-4">
                      <CalendarRange className="h-12 w-12 text-primary" />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="space-y-1">
                      <CardTitle className="text-xl">Visualize Data</CardTitle>
                      <CardDescription>See where your money goes</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <LineChart className="h-12 w-12 text-primary" />
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
