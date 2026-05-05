"use client"; // Add this directive

import { signOut } from "next-auth/react"; 
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut } from "lucide-react"; // Optional: Icon

type UserNavProps = {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  showDetails?: boolean;
  className?: string;
};

export function UserNav({ user, showDetails = false, className }: UserNavProps) {
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
    : "U";

  const handleSignOut = async () => {
    // Call signOut, redirect to login page after completion
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "relative rounded-full",
            showDetails
              ? "h-12 w-full justify-start gap-3 rounded-xl px-2"
              : "h-10 w-10 rounded-full",
            className
          )}
        >
          <Avatar className={cn(showDetails ? "h-9 w-9" : "h-8 w-8")}>
            <AvatarImage src={user.image || ""} alt={user.name || "User"} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          {showDetails && (
            <div className="min-w-0 text-left">
              <p className="truncate text-sm font-medium leading-none">{user.name || "User"}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {/* Change DropdownMenuItem to trigger the function */}
        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" /> {/* Optional Icon */}
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
