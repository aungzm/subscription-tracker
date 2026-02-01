"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
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
import { toast } from "@/components/ui/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  currency: z.string().optional(),
});

const passwordSchema = z
  .object({
    oldPassword: z.string().min(6, {
      message: "Current password is required.",
    }),
    newPassword: z.string().min(6, {
      message: "New password must be at least 6 characters.",
    }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords must match",
  });

type UserData = {
  name: string;
  email: string;
  image: string | null;
  currency: string;
};

type CurrencyList = {
  [key: string]: string;
};

export function ProfileSettings() {
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [currencies, setCurrencies] = useState<CurrencyList>({});
  const [isPasswordModalOpen, setPasswordModalOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", email: "", currency: "" },
  });

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { oldPassword: "", newPassword: "", confirmPassword: "" },
  });

  async function onPasswordSubmit(values: z.infer<typeof passwordSchema>) {
    setIsLoading(true);
    try {
      const response = await fetch("/api/user/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldPassword: values.oldPassword,
          newPassword: values.newPassword,
        }),
      });
      if (!response.ok) throw new Error("Failed to change password");
      toast({
        title: "Password Changed",
        description: "Your password has been updated.",
      });
      setPasswordModalOpen(false);
      passwordForm.reset();
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not change password.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Fetch user data
  useEffect(() => {
    async function fetchUserData() {
      try {
        const response = await fetch("/api/user/profile");
        if (!response.ok) throw new Error("Failed to fetch user data");
        const data = await response.json();
        setUserData(data);

        form.reset({
          name: data.name || "",
          email: data.email || "",
          currency: data.currency || "",
        });
      } catch (error) {
        console.error("Error fetching user data:", error);
        toast({
          title: "Error",
          description: "Failed to load profile data.",
          variant: "destructive",
        });
      } finally {
        setIsDataLoading(false);
      }
    }

    fetchUserData();
  }, [form]);

  // Fetch currencies
  useEffect(() => {
    async function fetchCurrencies() {
      try {
        const response = await fetch(
          "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies.min.json"
        );
        if (!response.ok) throw new Error("Failed to fetch currencies");
        const data = await response.json();
        setCurrencies(data);
      } catch (error) {
        console.error("Error fetching currencies:", error);
        toast({
          title: "Error",
          description: "Failed to load currency options.",
          variant: "destructive",
        });
      }
    }

    fetchCurrencies();
  }, []);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);

    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          image: userData?.image || null,
          currency: values.currency,
        }),
      });
      
      if (!response.ok) throw new Error("Failed to update profile");

      const result = await response.json();
      setUserData(result.user);

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const initials = userData?.name
    ? userData.name
        .split(" ")
        .map((n) => n[0])
        .join("")
    : "U";

  if (isDataLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="h-9 w-[120px]" />
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-[60px]" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-[60px]" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-[240px]" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-[120px]" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-[180px]" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-10 w-[140px]" />
            <Skeleton className="h-10 w-[120px]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={userData?.image || ""} alt={userData?.name} />
          <AvatarFallback className="text-lg">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <Button variant="outline" size="sm">
            Change Avatar
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input {...field} disabled />
                </FormControl>
                <FormDescription>
                  This is the email address you use to sign in.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preferred Currency</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(currencies).map(([code, name]) => (
                      <SelectItem key={code} value={code}>
                        {code.toUpperCase()} - {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Currency used for displaying prices
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPasswordModalOpen(true)}
            >
              Change Password
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Form>

      {/* Password Change Modal */}
      <Dialog open={isPasswordModalOpen} onOpenChange={setPasswordModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and choose a new one.
            </DialogDescription>
          </DialogHeader>
          <Form {...passwordForm}>
            <form
              onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
              className="space-y-4"
            >
              <FormField
                control={passwordForm.control}
                name="oldPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPasswordModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Changing..." : "Change Password"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
