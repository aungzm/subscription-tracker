"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { PlusCircle, Trash2, CreditCard, Edit, Check, X } from "lucide-react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"

type PaymentMethod = {
    id: string
    name: string
    type: string
    lastFour: string | null
    expiryDate: Date | null
}

const paymentTypes: Record<string, string> = {
    CREDIT_CARD: "Credit Card",
    DEBIT_CARD: "Debit Card",
    PAYPAL: "PayPal",
    APPLE_PAY: "Apple Pay",
    GOOGLE_PAY: "Google Pay",
    CRYPTO: "Crypto",
    BANK_TRANSFER: "Bank Transfer",
    OTHER: "Other",
}

export function PaymentSettings() {
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null)

    const form = useForm({
        defaultValues: {
            name: "",
            type: "",
            lastFour: "",
            expiryDate: ""
        }
    })

    useEffect(() => {
        fetchPaymentMethods()
    }, [])

    useEffect(() => {
        if (editingMethod) {
            form.reset({
                name: editingMethod.name,
                type: editingMethod.type,
                lastFour: editingMethod.lastFour || "",
                expiryDate: editingMethod.expiryDate
                    ? format(new Date(editingMethod.expiryDate), "yyyy-MM")
                    : ""
            })
        } else {
            form.reset({
                name: "",
                type: "",
                lastFour: "",
                expiryDate: ""
            })
        }
    }, [editingMethod, form])

    async function fetchPaymentMethods() {
        try {
            setIsLoading(true)
            const res = await fetch("/api/payment")

            if (!res.ok) throw new Error("Failed to fetch payment methods")

            const data = await res.json()
            setPaymentMethods(data)
        } catch (error) {
            console.error("Error fetching payment methods:", error)
            toast({
                title: "Error",
                description: "Failed to load payment methods",
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
    }

    async function onSubmit(values: any) {
        try {
            setIsLoading(true)

            const method = {
                name: values.name,
                type: values.type,
                lastFour: values.lastFour || null,
                expiryDate: values.expiryDate ? `${values.expiryDate}-01` : null
            }

            let res

            if (editingMethod) {
                res = await fetch(`/api/payment/${editingMethod.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(method)
                })
            } else {
                res = await fetch("/api/payment", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(method)
                })
            }

            if (!res.ok) {
                throw new Error("Failed to save payment method")
            }

            await fetchPaymentMethods()
            setIsDialogOpen(false)
            setEditingMethod(null)

            toast({
                title: editingMethod ? "Payment method updated" : "Payment method added",
                description: editingMethod
                    ? "Your payment method has been updated successfully."
                    : "Your payment method has been added successfully."
            })
        } catch (error) {
            console.error("Error saving payment method:", error)
            toast({
                title: "Error",
                description: "Something went wrong. Please try again.",
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
    }

    async function deletePaymentMethod(id: string) {
        try {
            setIsLoading(true)

            const res = await fetch(`/api/payment/${id}`, {
                method: "DELETE"
            })

            if (!res.ok) throw new Error("Failed to delete payment method")

            await fetchPaymentMethods()

            toast({
                title: "Payment method deleted",
                description: "Your payment method has been deleted successfully."
            })
        } catch (error) {
            console.error("Error deleting payment method:", error)
            toast({
                title: "Error",
                description: "Failed to delete payment method",
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
    }

    function handleEdit(method: PaymentMethod) {
        setEditingMethod(method)
        setIsDialogOpen(true)
    }

    function handleAdd() {
        setEditingMethod(null)
        setIsDialogOpen(true)
    }

    function formatCardInfo(method: PaymentMethod) {
        let display = method.name

        if (method.lastFour) {
            display += ` •••• ${method.lastFour}`
        }

        if (method.expiryDate) {
            display += ` • Expires ${format(new Date(method.expiryDate), "MM/yyyy")}`
        }

        return display
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Payment Methods</h3>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={handleAdd}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Method
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingMethod ? "Edit Payment Method" : "Add Payment Method"}</DialogTitle>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    rules={{ required: "Payment method name is required" }}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g. Personal Visa" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="type"
                                    rules={{ required: "Payment type is required" }}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Type</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select payment type" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {Object.entries(paymentTypes).map(([enumValue, label]) => (
                                                        <SelectItem key={enumValue} value={enumValue}>
                                                            {label}
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
                                    name="lastFour"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Last 4 digits (optional)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="e.g. 1234"
                                                    maxLength={4}
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="expiryDate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Expiry Date (optional)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="month"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="flex justify-end space-x-2 pt-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setIsDialogOpen(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={isLoading}>
                                        {isLoading ? "Saving..." : "Save"}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="space-y-2">
                {paymentMethods.map((method) => (
                    <div
                        key={method.id}
                        className="flex items-center justify-between p-4 border rounded-md hover:bg-accent/50 transition-colors"
                    >
                        <div className="flex items-center space-x-3">
                            <div className="flex items-center justify-center h-10 w-10 rounded-md bg-primary/10">
                                <CreditCard className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-medium">{formatCardInfo(method)}</span>
                                <span className="text-sm text-muted-foreground">
                                    {paymentTypes[method.type] || method.type}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(method)}>
                                <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deletePaymentMethod(method.id)}
                            >
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                    </div>
                ))}

                {paymentMethods.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground border border-dashed rounded-md">
                        No payment methods yet. Add your first payment method above.
                    </div>
                )}
            </div>
        </div>
    )
}