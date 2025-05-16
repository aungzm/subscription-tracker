"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { useForm } from "react-hook-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const providerSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  type: z.enum(["EMAIL", "PUSH"]),
  // SMTP fields
  smtpServer: z.string().optional().nullable(),
  smtpPort: z
    .preprocess(
      (val) => (val === "" || val == null ? null : Number(val)),
      z.number().optional().nullable()
    ),
  smtpUser: z.string().optional().nullable(),
  smtpPassword: z.string().optional().nullable(),
  // Webhook fields
  webhookUrl: z.string().url({ message: "Invalid URL" }).optional().nullable(),
  webhookSecret: z.string().optional().nullable(),
});

type Provider = z.infer<typeof providerSchema>;

export function NotificationSettings() {
  const [isPending, startTransition] = useTransition();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof providerSchema>>({
    resolver: zodResolver(providerSchema) as any,
    defaultValues: {
      name: "",
      type: "EMAIL",
      smtpServer: null,
      smtpPort: null,
      smtpUser: null,
      smtpPassword: null,
      webhookUrl: null,
      webhookSecret: null,
    },
  });

  const currentProviderType = form.watch("type");

  useEffect(() => {
    fetchProviders();
  }, []);

  useEffect(() => {
    if (editingProvider) {
      form.reset(editingProvider);
      setIsDialogOpen(true);
    } else {
      resetForm();
    }
  }, [editingProvider]);

  async function fetchProviders() {
    try {
      const response = await fetch("/api/notificationProvider");
      if (!response.ok) throw new Error("Failed to fetch notification providers");
      const data = await response.json();
      setProviders(data);
    } catch (error) {
      console.error("Fetch Providers Error:", error);
      toast({
        title: "Error Loading Providers",
        description: "Could not load notification providers.",
        variant: "destructive",
      });
    }
  }

  function onSubmit(values: Provider) {
    startTransition(async () => {
      try {
        let url = "/api/notificationProvider";
        let method = "POST";

        if (editingProvider?.id) {
          url += `/${editingProvider.id}`;
          method = "PUT";
        }

        const payload = { ...values };
        Object.keys(payload).forEach((key) => {
          const typedKey = key as keyof Provider;
          if (payload[typedKey] === "") {
            // Use type assertion to safely set null
            (payload as any)[typedKey] = null;
          }
        });

        const response = await fetch(url, {
          method,
          body: JSON.stringify(payload),
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            message: "Failed to save notification provider",
          }));
          throw new Error(
            errorData.message || "Failed to save notification provider"
          );
        }

        toast({
          title: "Success",
          description: editingProvider
            ? "Provider updated successfully"
            : "Provider created successfully",
        });

        fetchProviders();
        resetForm();
        setIsDialogOpen(false);
      } catch (error: any) {
        console.error("Submit Error:", error);
        toast({
          title: "Error Saving Provider",
          description: error.message || "Something went wrong. Please try again.",
          variant: "destructive",
        });
      }
    });
  }

  async function testProvider(values: Provider) {
    // Add test message
    const testPayload = {
      ...values,
      message: {
        subject: "Test Notification",
        body: "This is a test message from Subscription Tracker"
      }
    };
    try {
      const response = await fetch("/api/notificationProvider/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testPayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: "Failed to test provider",
        }));
        throw new Error(errorData.message || "Failed to test provider");
      }

      toast({
        title: "Test Successful",
        description: "Provider test succeeded.",
      });
    } catch (error: any) {
      toast({
        title: "Test Failed",
        description: error.message || "Could not test the provider.",
        variant: "destructive",
      });
    }
  }

  async function deleteProvider(id: string) {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/notificationProvider/${id}`, {
          method: "DELETE",
        });

        if (!response.ok)
          throw new Error("Failed to delete notification provider");

        toast({
          title: "Success",
          description: "Notification provider deleted successfully",
        });

        fetchProviders();
        if (editingProvider?.id === id) {
          resetForm();
          setIsDialogOpen(false);
        }
      } catch (error) {
        console.error("Delete Error:", error);
        toast({
          title: "Error Deleting Provider",
          description: "Failed to delete the provider",
          variant: "destructive",
        });
      }
    });
  }

  function resetForm() {
    form.reset({
      name: "",
      type: "EMAIL",
      smtpServer: null,
      smtpPort: null,
      smtpUser: null,
      smtpPassword: null,
      webhookUrl: null,
      webhookSecret: null,
    });
    setEditingProvider(null);
  }

  function handleDialogClose() {
    setIsDialogOpen(false);
    if (editingProvider) {
      resetForm();
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center mb-4">
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Provider
        </Button>
      </div>

      {providers.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {providers.map((provider) => (
            <Card key={provider.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
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
                <CardDescription>Type: {provider.type}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                {provider.smtpServer && (
                  <p>
                    SMTP: {provider.smtpServer}:{provider.smtpPort || "N/A"}
                  </p>
                )}
                {provider.smtpUser && <p>SMTP User: {provider.smtpUser}</p>}
                {provider.webhookUrl && <p>Webhook: {provider.webhookUrl}</p>}
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
          No notification providers found. Add one by clicking the "Add Provider" button.
        </p>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingProvider ? "Edit Provider" : "Add New Provider"}
            </DialogTitle>
            <DialogDescription>
              Configure email (SMTP) or push (Webhook) providers.
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
                        <Input {...field} placeholder="e.g., My Gmail SMTP" />
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
                          field.onChange(value);
                          if (value === "EMAIL") {
                            form.setValue("webhookUrl", null);
                            form.setValue("webhookSecret", null);
                          } else {
                            form.setValue("smtpServer", null);
                            form.setValue("smtpPort", null);
                            form.setValue("smtpUser", null);
                            form.setValue("smtpPassword", null);
                          }
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="EMAIL">Email (SMTP)</SelectItem>
                          <SelectItem value="PUSH">Push (Webhook)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Tabs value={currentProviderType} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger
                    value="EMAIL"
                    disabled={currentProviderType !== "EMAIL"}
                  >
                    SMTP Configuration
                  </TabsTrigger>
                  <TabsTrigger
                    value="PUSH"
                    disabled={currentProviderType !== "PUSH"}
                  >
                    Webhook Configuration
                  </TabsTrigger>
                </TabsList>

                <TabsContent
                  value="EMAIL"
                  className="mt-4 space-y-4 border p-4 rounded-md"
                >
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Required for Email Notifications
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="smtpServer"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SMTP Server</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value ?? ""}
                              placeholder="smtp.example.com"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="smtpPort"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SMTP Port</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value ?? ""}
                              placeholder="587"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="smtpUser"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SMTP User</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value ?? ""}
                              placeholder="user@example.com"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="smtpPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SMTP Password</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value ?? ""}
                              type="password"
                              placeholder="••••••••"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                <TabsContent
                  value="PUSH"
                  className="mt-4 space-y-4 border p-4 rounded-md"
                >
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Required for Push Notifications
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="webhookUrl"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Webhook URL</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value ?? ""}
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
                        <FormItem className="col-span-2">
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
                </TabsContent>
              </Tabs>

              <DialogFooter>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDialogClose}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    const isValid = await form.trigger();
                    if (!isValid) return;
                    const values = form.getValues();
                    testProvider(values);
                  }}
                  disabled={isPending}
                >
                  Test Provider
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending
                    ? "Saving..."
                    : editingProvider
                      ? "Update Provider"
                      : "Add Provider"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
