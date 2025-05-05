"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import * as z from "zod"
import { CalendarIcon, Plus, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  MultiSelect,
  MultiSelectContent,
  MultiSelectItem,
  MultiSelectTrigger,
  MultiSelectValue,
} from "@/components/ui/multi-select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { Card, CardContent } from "@/components/ui/card"

// --- TYPES ---
type NotificationProvider = { id: string; name: string }
type Category = { id: string; name: string }
type PaymentMethod = { id: string; name: string }
type Currency = { code: string; name: unknown }

type ReminderFormValue = {
  id?: string
  reminderDate: Date
  notificationProviderIds: string[]
}

type SubscriptionFormValues = {
  name: string
  cost: number
  currency: string
  billingFrequency: "monthly" | "yearly" | "weekly" | "custom"
  startDate: Date
  endDate?: Date | null
  paymentMethod: string
  paymentType: "automatic" | "manual"
  category: string
  notes?: string
  reminders?: ReminderFormValue[]
}

type SubscriptionApiResponse = {
  id: string
  name: string
  cost: number
  currency: string
  billingFrequency: string
  startDate: string | Date
  endDate?: string | Date | null
  notes?: string
  isShared?: boolean
  createdAt?: string
  updatedAt?: string
  userId?: string
  category: string // name
  paymentMethod: string // name
  reminders: Array<{
    date: string | Date
    providers: string[] // names
  }>
}

// --- SCHEMA ---
const reminderSchema = z.object({
  id: z.string().optional(),
  reminderDate: z.date(),
  notificationProviderIds: z.array(z.string()).min(1, {
    message: "At least one notification provider is required",
  }),
})

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  cost: z.coerce.number().positive({
    message: "Cost must be a positive number.",
  }),
  currency: z.string().min(1, {
    message: "Please select a currency.",
  }),
  billingFrequency: z.enum(["monthly", "yearly", "weekly", "custom"]),
  startDate: z.date(),
  endDate: z.date().optional().nullable(),
  paymentMethod: z.string().min(1, {
    message: "Please select a payment method.",
  }),
  paymentType: z.enum(["automatic", "manual"], {
    message: "Please select a payment type.",
  }),
  category: z.string().min(1, {
    message: "Please select a category.",
  }),
  notes: z.string().optional(),
  reminders: z.array(reminderSchema).optional(),
})

// --- HOOKS FOR DROPDOWNS ---
function useNotificationProviders() {
  const [providers, setProviders] = useState<NotificationProvider[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetch("/api/notificationProvider")
      .then((res) => res.json())
      .then((data) => {
        setProviders(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])
  return { providers, loading }
}

function useCategories() {
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<Category[]>([])
  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        setCategories(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])
  return { categories, loading }
}

const usePaymentMethods = () => {
  const [loading, setLoading] = useState(true)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  useEffect(() => {
    fetch("/api/payment")
      .then((res) => res.json())
      .then((data) => {
        setPaymentMethods(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])
  return { paymentMethods, loading }
}

function useCurrencies() {
  const [loading, setLoading] = useState(true)
  const [currencies, setCurrencies] = useState<Currency[]>([])
  useEffect(() => {
    fetch(
      "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies.min.json"
    )
      .then((res) => res.json())
      .then((data) => {
        const currencyArray = Object.entries(data).map(([code, name]) => ({
          code: code.toUpperCase(),
          name,
        }))
        setCurrencies(currencyArray)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])
  return { currencies, loading }
}

// --- MAIN FORM COMPONENT ---
type SubscriptionFormProps = {
  initialValues?: Partial<SubscriptionFormValues>
  subscriptionId?: string
  mode?: "create" | "edit"
}

export function SubscriptionForm({
  initialValues,
  subscriptionId,
  mode: _mode,
}: SubscriptionFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [fetchingData, setFetchingData] = useState(false)
  const { categories, loading: categoriesLoading } = useCategories()
  const { providers, loading: providersLoading } = useNotificationProviders()
  const { currencies, loading: currenciesLoading } = useCurrencies()
  const { paymentMethods, loading: paymentMethodsLoading } = usePaymentMethods()

  // Determine mode
  const mode = _mode || (subscriptionId ? "edit" : "create")

  // Default values for the form
  const defaultValues: SubscriptionFormValues = {
    name: "",
    cost: 0,
    currency: "",
    billingFrequency: "monthly",
    paymentMethod: "",
    paymentType: "automatic",
    category: "",
    notes: "",
    reminders: [],
    startDate: new Date(),
    endDate: null,
  }

  const form = useForm<SubscriptionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  })

  // Field array for managing multiple reminders
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "reminders",
  })

  // Helper: find ID by name
  function findIdByName<T extends { id: string; name: string }>(
    arr: T[],
    name: string
  ): string | "" {
    const found = arr.find((item) => item.name === name)
    return found ? found.id : ""
  }

  // Helper: find IDs by names
  function findIdsByNames<T extends { id: string; name: string }>(
    arr: T[],
    names: string[]
  ): string[] {
    return names
      .map((name) => arr.find((item) => item.name === name)?.id)
      .filter((id): id is string => !!id)
  }

  // Fetch subscription data when in edit mode
  useEffect(() => {
    if (
      mode === "edit" &&
      subscriptionId &&
      categories.length > 0 &&
      paymentMethods.length > 0 &&
      providers.length > 0
    ) {
      setFetchingData(true)
      fetch(`/api/subscriptions/${subscriptionId}`)
        .then((res) => res.json())
        .then((data: SubscriptionApiResponse) => {
          // Map the API response to form values
          const formData: SubscriptionFormValues = {
            name: data.name,
            cost: data.cost,
            currency: data.currency,
            billingFrequency: data.billingFrequency as any,
            startDate: new Date(data.startDate),
            endDate: data.endDate ? new Date(data.endDate) : null,
            paymentMethod: findIdByName(paymentMethods, data.paymentMethod),
            paymentType: "automatic", // You may want to add this to your API
            category: findIdByName(categories, data.category),
            notes: data.notes || "",
            reminders:
              data.reminders?.map((reminder) => ({
                reminderDate: new Date(reminder.date),
                notificationProviderIds: findIdsByNames(
                  providers,
                  reminder.providers
                ),
              })) || [],
          }
          form.reset(formData)
          setFetchingData(false)
        })
        .catch((error) => {
          console.error("Error fetching subscription:", error)
          toast({
            title: "Error",
            description: "Failed to load subscription data",
            variant: "destructive",
          })
          setFetchingData(false)
        })
    } else if (mode === "create" && initialValues) {
      // For creating with initial values
      const formData: SubscriptionFormValues = {
        ...defaultValues,
        ...initialValues,
        startDate: initialValues.startDate
          ? new Date(initialValues.startDate)
          : new Date(),
        endDate: initialValues.endDate
          ? new Date(initialValues.endDate)
          : null,
        reminders: initialValues.reminders || [],
      }
      form.reset(formData)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    subscriptionId,
    mode,
    initialValues,
    categories,
    paymentMethods,
    providers,
  ])

  async function onSubmit(values: SubscriptionFormValues) {
    setIsLoading(true)
    try {
      // Prepare the main subscription data
      const subscriptionData = {
        ...values,
        endDate:
          !values.endDate ||
          (values.endDate instanceof Date && isNaN(values.endDate.getTime()))
            ? null
            : values.endDate,
      }

      // Remove reminders from subscription data as we'll handle them separately
      const { reminders, ...subscriptionPayload } = subscriptionData

      let response
      let newSubscriptionId

      // Create or update the subscription
      if (mode === "edit" && subscriptionId) {
        response = await fetch(`/api/subscriptions/${subscriptionId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscriptionPayload),
        })
        newSubscriptionId = subscriptionId
      } else {
        response = await fetch("/api/subscriptions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscriptionPayload),
        })
        const data = await response.json()
        newSubscriptionId = data.id
      }

      if (!response.ok) throw new Error("Failed to save subscription")

      // Handle reminders if any
      if (values.reminders && values.reminders.length > 0) {
        // Process each reminder
        await Promise.all(
          values.reminders.map(async (reminder) => {
            const reminderPayload = {
              subscriptionId: newSubscriptionId,
              reminderDate: reminder.reminderDate,
              notificationProviderIds: reminder.notificationProviderIds,
              id: reminder.id, // Include ID if it's an existing reminder
            }

            // Create or update reminder
            await fetch("/api/reminders", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(reminderPayload),
            })
          })
        )
      }

      toast({
        title: "Success",
        description: `Subscription ${
          mode === "edit" ? "updated" : "added"
        }.`,
      })
      router.push("/dashboard/subscriptions")
      router.refresh()
    } catch (error) {
      console.error("Submission error:", error)
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Add a new empty reminder
  const addReminder = () => {
    append({
      reminderDate: new Date(),
      notificationProviderIds: [],
    })
  }

  if (fetchingData) {
    return <div>Loading subscription data...</div>
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Netflix" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex gap-2">
            <FormField
              control={form.control}
              name="cost"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Cost</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="9.99"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem className="w-24">
                  <FormLabel>Currency</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="$" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {currencies.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          {currency.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="billingFrequency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Billing Frequency</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select billing frequency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="paymentMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Method</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {paymentMethods.map((payment) => (
                      <SelectItem key={payment.id} value={payment.id}>
                        {payment.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Start Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className="w-full pl-3 text-left font-normal"
                      >
                        {field.value
                          ? format(field.value, "PPP")
                          : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>End Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className="w-full pl-3 text-left font-normal"
                      >
                        {field.value
                          ? format(field.value, "PPP")
                          : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ?? undefined}
                      onSelect={(date) => field.onChange(date ?? null)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  Optional: Leave blank if your subscription has no end date.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={categoriesLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="paymentType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Type</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="automatic">Automatic</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Choose whether payments are processed automatically or
                  manually
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Reminders Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Reminders</h3>
            <Button
              type="button"
              onClick={addReminder}
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              Add Reminder
            </Button>
          </div>

          {fields.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No reminders added. Click "Add Reminder" to set up reminders for
              this subscription.
            </p>
          )}

          {fields.map((field, index) => (
            <Card key={field.id} className="p-0">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-4">
                  <h4 className="text-sm font-medium">
                    Reminder #{index + 1}
                  </h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                    className="h-8 w-8 p-0"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Remove</span>
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name={`reminders.${index}.reminderDate`}
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Reminder Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className="w-full pl-3 text-left font-normal"
                              >
                                {field.value
                                  ? format(field.value, "PPP")
                                  : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`reminders.${index}.notificationProviderIds`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notification Providers</FormLabel>
                        <FormControl>
                          <MultiSelect
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select providers"
                            disabled={providersLoading}
                          >
                            <MultiSelectTrigger>
                              <MultiSelectValue placeholder="Select providers" />
                            </MultiSelectTrigger>
                            <MultiSelectContent>
                              {providers.map((provider) => (
                                <MultiSelectItem
                                  key={provider.id}
                                  value={provider.id}
                                >
                                  {provider.name}
                                </MultiSelectItem>
                              ))}
                            </MultiSelectContent>
                          </MultiSelect>
                        </FormControl>
                        <FormDescription>
                          Select at least one notification provider
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Add any additional information about this subscription"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Optional: Add any details about this subscription.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/subscriptions")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading
              ? mode === "edit"
                ? "Saving..."
                : "Saving..."
              : mode === "edit"
              ? "Save Changes"
              : "Save Subscription"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
