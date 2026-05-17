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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const providerSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().min(1, "Name is required"),
    type: z.enum(["EMAIL", "PUSH"]),
    email: z.string().optional(),
    webhookUrl: z.string().optional(),
    webhookSecret: z.string().optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.type === "EMAIL") {
      if (!value.email) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Valid email is required",
          path: ["email"],
        })
        return
      }

      const parsed = z.string().email().safeParse(value.email)
      if (!parsed.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Valid email is required",
          path: ["email"],
        })
      }
    }

    if (value.type === "PUSH") {
      if (!value.webhookUrl) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Webhook URL is required",
          path: ["webhookUrl"],
        })
        return
      }

      const parsed = z.string().url().safeParse(value.webhookUrl)
      if (!parsed.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid URL",
          path: ["webhookUrl"],
        })
      }
    }
  })

type Provider = z.infer<typeof providerSchema>

function getDefaultValues(): Provider {
  return {
    name: "",
    type: "EMAIL",
    email: "",
  }
}

export function NotificationSettings() {
  const [isPending, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState(true)
  const [providers, setProviders] = useState<Provider[]>([])
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const form = useForm<Provider>({
    resolver:
      zodResolver(providerSchema) as unknown as import("react-hook-form").Resolver<Provider>,
    defaultValues: getDefaultValues(),
  })

  const selectedType = form.watch("type")

  useEffect(() => {
    fetchProviders()
  }, [])

  useEffect(() => {
    if (editingProvider) {
      form.reset(editingProvider)
      setIsDialogOpen(true)
    } else if (!isDialogOpen) {
      resetForm()
    }
  }, [editingProvider, form, isDialogOpen])

  async function fetchProviders() {
    try {
      const response = await fetch("/api/notificationProvider")
      if (!response.ok) {
        throw new Error("Failed to fetch notification providers")
      }

      const data = (await response.json()) as Provider[]
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

        const response = await fetch(url, {
          method,
          body: JSON.stringify(values),
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            message: "Failed to save notification provider",
          }))
          throw new Error(
            errorData.message || errorData.error || "Failed to save notification provider"
          )
        }

        toast({
          title: "Success",
          description: editingProvider
            ? `${values.type === "EMAIL" ? "Email" : "Webhook"} updated successfully`
            : `${values.type === "EMAIL" ? "Email" : "Webhook"} created successfully`,
        })

        await fetchProviders()
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

      const data = (await response.json()) as {
        message?: string
        delivery?: {
          status: number
          target: string
          responsePreview: string | null
        }
      }

      toast({
        title: "Test Successful",
        description: [
          data.message || `${values.type === "EMAIL" ? "Email" : "Webhook"} test succeeded.`,
          data.delivery ? `HTTP ${data.delivery.status}` : null,
          data.delivery?.responsePreview ? `Response: ${data.delivery.responsePreview}` : null,
        ]
          .filter(Boolean)
          .join(" "),
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
          description: "Notification provider deleted successfully",
        })

        await fetchProviders()
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
    form.reset(getDefaultValues())
    setEditingProvider(null)
  }

  function openNewProviderDialog() {
    resetForm()
    setIsDialogOpen(true)
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-10 w-[160px]" />
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
        <Button onClick={openNewProviderDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Provider
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
                <CardDescription>
                  {provider.type === "EMAIL" ? "Extra reminder recipient" : "Optional webhook destination"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>Type: {provider.type === "EMAIL" ? "Email" : "Webhook"}</p>
                {provider.type === "EMAIL" ? (
                  <p>Email: {provider.email}</p>
                ) : (
                  <p>Webhook: {provider.webhookUrl}</p>
                )}
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
          No notification providers found. Add an email destination or webhook for reminder fan-out.
        </p>
      )}

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) {
            resetForm()
          }
        }}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingProvider ? "Edit Notification Provider" : "Add Notification Provider"}
            </DialogTitle>
            <DialogDescription>
              Resend still sends the app-wide reminder email. These providers are optional extra destinations for demoing email fan-out or webhook delivery.
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
                      <FormLabel>Provider Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Finance team inbox" />
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
                      <Select
                        value={field.value}
                        onValueChange={(value: "EMAIL" | "PUSH") => {
                          field.onChange(value)
                          if (value === "EMAIL") {
                            form.reset({
                              id: form.getValues("id"),
                              name: form.getValues("name"),
                              type: "EMAIL",
                              email: "",
                            })
                            return
                          }

                          form.reset({
                            id: form.getValues("id"),
                            name: form.getValues("name"),
                            type: "PUSH",
                            webhookUrl: "",
                            webhookSecret: null,
                          })
                        }}
                        disabled={isPending}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a provider type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="EMAIL">Email</SelectItem>
                          <SelectItem value="PUSH">Webhook</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Pick where reminder copies should be delivered.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {selectedType === "EMAIL" ? (
                <div className="space-y-4 rounded-md border p-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Destination Email</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="alerts@example.com" />
                        </FormControl>
                        <FormDescription>
                          This sends an additional copy through your existing Resend setup.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ) : (
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
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    setIsDialogOpen(false)
                    resetForm()
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
                  Test {selectedType === "EMAIL" ? "Email" : "Webhook"}
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending
                    ? "Saving..."
                    : editingProvider
                      ? `Update ${selectedType === "EMAIL" ? "Email" : "Webhook"}`
                      : `Add ${selectedType === "EMAIL" ? "Email" : "Webhook"}`}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
