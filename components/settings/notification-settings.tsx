"use client"

import { useEffect, useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { useForm } from "react-hook-form"
import { Plus, Trash } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"

const providerSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  type: z.literal("PUSH"),
  webhookUrl: z.string().url({ message: "Invalid URL" }),
  webhookSecret: z.string().optional().nullable(),
})

type Provider = z.infer<typeof providerSchema>

export function NotificationSettings() {
  const [isPending, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState(true)
  const [providers, setProviders] = useState<Provider[]>([])
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const form = useForm<Provider>({
    resolver:
      zodResolver(providerSchema) as unknown as import("react-hook-form").Resolver<Provider>,
    defaultValues: {
      name: "",
      type: "PUSH",
      webhookUrl: "",
      webhookSecret: null,
    },
  })

  useEffect(() => {
    fetchProviders()
  }, [])

  useEffect(() => {
    if (editingProvider) {
      form.reset(editingProvider)
      setIsDialogOpen(true)
    } else {
      resetForm()
    }
  }, [editingProvider, form])

  async function fetchProviders() {
    try {
      const response = await fetch("/api/notificationProvider")
      if (!response.ok) {
        throw new Error("Failed to fetch notification providers")
      }

      const data = await response.json()
      setProviders(data)
    } catch (error) {
      console.error("Fetch Providers Error:", error)
      toast({
        title: "Error Loading Providers",
        description: "Could not load notification providers.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  function onSubmit(values: Provider) {
    startTransition(async () => {
      try {
        let url = "/api/notificationProvider"
        let method = "POST"

        if (editingProvider?.id) {
          url += `/${editingProvider.id}`
          method = "PUT"
        }

        const payload = {
          ...values,
          webhookSecret: values.webhookSecret || null,
        }

        const response = await fetch(url, {
          method,
          body: JSON.stringify(payload),
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            message: "Failed to save notification provider",
          }))
          throw new Error(
            errorData.message || "Failed to save notification provider"
          )
        }

        toast({
          title: "Success",
          description: editingProvider
            ? "Webhook updated successfully"
            : "Webhook created successfully",
        })

        fetchProviders()
        resetForm()
        setIsDialogOpen(false)
      } catch (error) {
        console.error("Submit Error:", error)
        toast({
          title: "Error Saving Provider",
          description:
            error instanceof Error
              ? error.message
              : "Something went wrong. Please try again.",
          variant: "destructive",
        })
      }
    })
  }

  async function testProvider(values: Provider) {
    const testPayload = {
      ...values,
      message: {
        subject: "Test Notification",
        body: "This is a test message from Subscription Tracker",
      },
    }

    try {
      const response = await fetch("/api/notificationProvider/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testPayload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: "Failed to test provider",
        }))
        throw new Error(errorData.message || "Failed to test provider")
      }

      toast({
        title: "Test Successful",
        description: "Webhook test succeeded.",
      })
    } catch (error) {
      toast({
        title: "Test Failed",
        description:
          error instanceof Error
            ? error.message
            : "Could not test the provider.",
        variant: "destructive",
      })
    }
  }

  async function deleteProvider(id: string) {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/notificationProvider/${id}`, {
          method: "DELETE",
        })

        if (!response.ok) {
          throw new Error("Failed to delete notification provider")
        }

        toast({
          title: "Success",
          description: "Webhook deleted successfully",
        })

        fetchProviders()
        if (editingProvider?.id === id) {
          resetForm()
          setIsDialogOpen(false)
        }
      } catch (error) {
        console.error("Delete Error:", error)
        toast({
          title: "Error Deleting Provider",
          description: "Failed to delete the provider",
          variant: "destructive",
        })
      }
    })
  }

  function resetForm() {
    form.reset({
      name: "",
      type: "PUSH",
      webhookUrl: "",
      webhookSecret: null,
    })
    setEditingProvider(null)
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-10 w-[140px]" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <Skeleton className="h-6 w-[120px]" />
                  <Skeleton className="h-8 w-8" />
                </div>
                <Skeleton className="h-4 w-[80px]" />
              </CardHeader>
              <CardContent className="space-y-1">
                <Skeleton className="h-4 w-[180px]" />
                <Skeleton className="h-4 w-[140px]" />
              </CardContent>
              <div className="p-6 pt-0">
                <Skeleton className="h-9 w-[60px]" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="mb-4 flex items-center justify-between">
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Webhook
        </Button>
      </div>

      {providers.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {providers.map((provider) => (
            <Card key={provider.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle>{provider.name}</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteProvider(provider.id!)}
                    disabled={isPending}
                    aria-label={`Delete provider ${provider.name}`}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription>Optional webhook destination</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>Webhook: {provider.webhookUrl}</p>
              </CardContent>
              <CardFooter>
                <Button
                  variant="outline"
                  onClick={() => setEditingProvider(provider)}
                  disabled={isPending}
                >
                  Edit
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">
          No webhook providers found. Email reminders are handled automatically
          through the app-wide Resend integration.
        </p>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingProvider ? "Edit Webhook" : "Add New Webhook"}
            </DialogTitle>
            <DialogDescription>
              Email reminders use the app-wide Resend configuration. Add webhooks
              here if you also want reminder fan-out to Discord, Slack gateways,
              or other webhook endpoints.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Webhook Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Discord billing alerts" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provider Type</FormLabel>
                      <FormControl>
                        <Input {...field} disabled />
                      </FormControl>
                      <FormDescription>
                        Webhooks are the only user-managed reminder providers.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4 rounded-md border p-4">
                <FormField
                  control={form.control}
                  name="webhookUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Webhook URL</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="https://your-service.com/webhook"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="webhookSecret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Webhook Secret (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ""}
                          placeholder="Optional secret for verification"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    setIsDialogOpen(false)
                    if (editingProvider) {
                      resetForm()
                    }
                  }}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    const isValid = await form.trigger()
                    if (!isValid) {
                      return
                    }
                    await testProvider(form.getValues())
                  }}
                  disabled={isPending}
                >
                  Test Webhook
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending
                    ? "Saving..."
                    : editingProvider
                      ? "Update Webhook"
                      : "Add Webhook"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
