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
import type { Resolver } from "react-hook-form"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Label } from "@/components/ui/label"
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
import {
  detectReminderPreset,
  getPresetReminderDate,
  REMINDER_PRESET_OPTIONS,
  type ReminderPreset,
} from "@/lib/reminder-presets"
import {
  dbValueToReminderPreset,
  getReminderNextSendAt,
} from "@/lib/reminder-schedule"

// --- TYPES ---
type NotificationProvider = { id: string; name: string }
type Category = { id: string; name: string; color?: string | null }
type PaymentMethod = { id: string; name: string }
type Currency = { code: string; name: unknown }

type ReminderFormValue = {
  id?: string
  reminderPreset?: ReminderPreset
  reminderDate: Date
  nextSendAt?: Date | null
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
  createdAt?: string
  updatedAt?: string
  userId?: string
  category: string | null // id
  paymentMethod: string | null // id
  reminders: Array<{
    id: string
    date: string | Date
    preset?: string | null
    nextSendAt?: string | Date | null
    providers: string[] // ids
  }>
}

// --- SCHEMA ---
const reminderSchema = z.object({
  id: z.string().optional(),
  reminderPreset: z
    .enum(["custom", "1-day-before", "3-days-before", "1-week-before"])
    .optional(),
  reminderDate: z.coerce.date(),
  nextSendAt: z.coerce.date().optional().nullable(),
  notificationProviderIds: z.array(z.string()),
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
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional().nullable(),
  paymentMethod: z.string().min(1, {
    message: "Please select a payment method.",
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
  const [initialReminderIds, setInitialReminderIds] = useState<string[]>([])
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
    category: "",
    notes: "",
    reminders: [],
    startDate: new Date(),
    endDate: null,
  }

  const form = useForm<SubscriptionFormValues>({
    resolver: zodResolver(formSchema) as unknown as Resolver<SubscriptionFormValues>,
    defaultValues,
  })
  // Field array for managing multiple reminders
  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "reminders",
  })
  const watchedStartDate = form.watch("startDate")
  const watchedBillingFrequency = form.watch("billingFrequency")
  const watchedReminders = form.watch("reminders") ?? []

  // --- Reminder modal state ---
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false)
  const [reminderDraft, setReminderDraft] = useState<ReminderFormValue | null>(null)
  const [editingReminderIndex, setEditingReminderIndex] = useState<number | null>(null)

  function updateDraftPreset(preset: ReminderPreset) {
    setReminderDraft((current) => {
      if (!current) return current
      if (preset === "custom") {
        return { ...current, reminderPreset: preset }
      }
      const computed = getPresetReminderDate(
        preset,
        watchedStartDate,
        watchedBillingFrequency
      )
      return {
        ...current,
        reminderPreset: preset,
        reminderDate: computed ?? current.reminderDate,
        nextSendAt: computed ?? current.nextSendAt,
      }
    })
  }

  function openAddReminderDialog() {
    const preset: ReminderPreset = "1-day-before"
    const computed = getPresetReminderDate(
      preset,
      watchedStartDate,
      watchedBillingFrequency
    )
    setReminderDraft({
      reminderPreset: preset,
      reminderDate: computed ?? new Date(),
      nextSendAt: computed ?? new Date(),
      notificationProviderIds: [],
    })
    setEditingReminderIndex(null)
    setReminderDialogOpen(true)
  }

  function openEditReminderDialog(index: number) {
    const existing = watchedReminders[index]
    if (!existing) return
    setReminderDraft({
      id: existing.id,
      reminderPreset: existing.reminderPreset ?? "custom",
      reminderDate: existing.reminderDate,
      nextSendAt: existing.nextSendAt ?? existing.reminderDate,
      notificationProviderIds: existing.notificationProviderIds ?? [],
    })
    setEditingReminderIndex(index)
    setReminderDialogOpen(true)
  }

  function saveReminderDraft() {
    if (!reminderDraft) return
    if (editingReminderIndex !== null) {
      update(editingReminderIndex, reminderDraft)
    } else {
      append(reminderDraft)
    }
    setReminderDialogOpen(false)
    setReminderDraft(null)
    setEditingReminderIndex(null)
  }

  function closeReminderDialog() {
    setReminderDialogOpen(false)
    setReminderDraft(null)
    setEditingReminderIndex(null)
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
            billingFrequency: data.billingFrequency as "monthly" | "yearly" | "weekly" | "custom",
            startDate: new Date(data.startDate),
            endDate: data.endDate ? new Date(data.endDate) : null,
            paymentMethod: data.paymentMethod ?? "",
            category: data.category ?? "",
            notes: data.notes || "",
            reminders:
              data.reminders?.map((reminder) => ({
                id: reminder.id,
                reminderPreset: reminder.preset
                  ? dbValueToReminderPreset(reminder.preset)
                  : detectReminderPreset(
                      new Date(reminder.date),
                      new Date(data.startDate),
                      data.billingFrequency
                    ),
                reminderDate: new Date(reminder.date),
                nextSendAt: reminder.nextSendAt
                  ? new Date(reminder.nextSendAt)
                  : null,
                notificationProviderIds: reminder.providers ?? [],
              })) || [],
          }
          form.reset(formData)
          setInitialReminderIds(
            (data.reminders ?? []).map((r) => r.id).filter((id): id is string => !!id)
          )
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

      // Delete any reminders that were removed from the form (edit mode only)
      if (mode === "edit" && initialReminderIds.length > 0) {
        const remainingIds = new Set(
          (values.reminders ?? [])
            .map((r) => r.id)
            .filter((id): id is string => !!id)
        )
        const removedIds = initialReminderIds.filter((id) => !remainingIds.has(id))
        await Promise.all(
          removedIds.map((id) =>
            fetch(`/api/reminders/${id}`, { method: "DELETE" })
          )
        )
      }

      // Handle reminders if any
      if (values.reminders && values.reminders.length > 0) {
        // Process each reminder
        await Promise.all(
          values.reminders.map(async (reminder) => {
            const reminderPayload = {
              subscriptionId: newSubscriptionId,
              reminderDate: reminder.reminderDate,
              reminderPreset: reminder.reminderPreset ?? "custom",
              nextSendAt: getReminderNextSendAt({
                reminderPreset: reminder.reminderPreset ?? "custom",
                reminderDate: reminder.reminderDate,
                startDate: values.startDate,
                billingFrequency: values.billingFrequency,
              }),
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
      router.push("/subscriptions")
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

  useEffect(() => {
    watchedReminders.forEach((reminder, index) => {
      if (!reminder?.reminderPreset || reminder.reminderPreset === "custom") {
        return
      }

      const computedDate = getPresetReminderDate(
        reminder.reminderPreset,
        watchedStartDate,
        watchedBillingFrequency
      )

      if (!computedDate) {
        return
      }

      const currentDate = reminder.reminderDate
      if (
        !currentDate ||
        currentDate.getTime() !== computedDate.getTime()
      ) {
        form.setValue(`reminders.${index}.reminderDate`, computedDate, {
          shouldDirty: true,
          shouldValidate: true,
        })
        form.setValue(`reminders.${index}.nextSendAt`, computedDate, {
          shouldDirty: true,
          shouldValidate: true,
        })
      }
    })
  }, [form, watchedBillingFrequency, watchedReminders, watchedStartDate])

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
                        <span className="flex items-center gap-2">
                          <span
                            aria-hidden
                            className="inline-block h-3 w-3 rounded-full border border-border"
                            style={{ backgroundColor: category.color ?? "#9CA3AF" }}
                          />
                          {category.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              onClick={openAddReminderDialog}
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
              No reminders added. Click &quot;Add Reminder&quot; to set up reminders for
              this subscription.
            </p>
          )}

          {fields.map((field, index) => {
            const reminder = watchedReminders[index]
            const preset = reminder?.reminderPreset ?? "custom"
            const presetLabel =
              REMINDER_PRESET_OPTIONS.find((o) => o.value === preset)?.label ??
              "Custom date"
            const providerNames = (reminder?.notificationProviderIds ?? [])
              .map((id) => providers.find((p) => p.id === id)?.name)
              .filter((name): name is string => !!name)
            return (
              <Card key={field.id} className="p-0">
                <CardContent className="flex items-start justify-between gap-4 p-4">
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">Reminder #{index + 1}</p>
                    <p className="text-muted-foreground">
                      {presetLabel}
                      {reminder?.reminderDate
                        ? ` · ${format(reminder.reminderDate, "PPP")}`
                        : ""}
                    </p>
                    <p className="text-muted-foreground">
                      {providerNames.length > 0
                        ? `Extra destinations: ${providerNames.join(", ")}`
                        : "No extra destinations"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openEditReminderDialog(index)}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                      className="h-8 w-8 p-0"
                      aria-label={`Remove reminder ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <Dialog
          open={reminderDialogOpen}
          onOpenChange={(open) => {
            if (!open) closeReminderDialog()
            else setReminderDialogOpen(true)
          }}
        >
          <DialogContent className="sm:max-w-[560px]">
            <DialogHeader>
              <DialogTitle>
                {editingReminderIndex !== null ? "Edit Reminder" : "Add Reminder"}
              </DialogTitle>
              <DialogDescription>
                Pick when to send the reminder and (optionally) extra destinations.
              </DialogDescription>
            </DialogHeader>

            {reminderDraft && (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Reminder Timing</Label>
                    <Select
                      value={reminderDraft.reminderPreset ?? "custom"}
                      onValueChange={(value) =>
                        updateDraftPreset(value as ReminderPreset)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select reminder timing" />
                      </SelectTrigger>
                      <SelectContent>
                        {REMINDER_PRESET_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Presets are calculated from the next renewal date.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label>Reminder Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full pl-3 text-left font-normal"
                          disabled={
                            (reminderDraft.reminderPreset ?? "custom") !== "custom"
                          }
                        >
                          {reminderDraft.reminderDate
                            ? format(reminderDraft.reminderDate, "PPP")
                            : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={reminderDraft.reminderDate}
                          onSelect={(date) => {
                            if (!date) return
                            setReminderDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    reminderPreset: "custom",
                                    reminderDate: date,
                                    nextSendAt: date,
                                  }
                                : current
                            )
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                    {(reminderDraft.reminderPreset ?? "custom") !== "custom" && (
                      <p className="text-xs text-muted-foreground">
                        Auto-set from the selected preset.
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notification Providers</Label>
                  <MultiSelect
                    value={reminderDraft.notificationProviderIds}
                    onChange={(ids) =>
                      setReminderDraft((current) =>
                        current
                          ? { ...current, notificationProviderIds: ids }
                          : current
                      )
                    }
                    placeholder="Select providers"
                    disabled={providersLoading}
                  >
                    <MultiSelectTrigger>
                      <MultiSelectValue placeholder="Select providers" />
                    </MultiSelectTrigger>
                    <MultiSelectContent>
                      {providers.map((provider) => (
                        <MultiSelectItem key={provider.id} value={provider.id}>
                          {provider.name}
                        </MultiSelectItem>
                      ))}
                    </MultiSelectContent>
                  </MultiSelect>
                  <p className="text-xs text-muted-foreground">
                    Optional extra email or webhook destinations for this reminder.
                  </p>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeReminderDialog}>
                Cancel
              </Button>
              <Button type="button" onClick={saveReminderDraft}>
                {editingReminderIndex !== null ? "Save Changes" : "Add Reminder"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
            onClick={() => router.push("/subscriptions")}
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
