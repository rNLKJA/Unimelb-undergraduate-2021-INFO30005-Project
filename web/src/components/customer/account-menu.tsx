"use client";

import { LogOut, ReceiptText, UserRound } from "lucide-react";
import Link from "next/link";
import { customerLogoutAction } from "@/app/customer/actions";
import { avatarSrc, SnackImage } from "@/components/shared/snack-image";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AccountMenu({
  customer,
}: {
  customer: {
    firstName: string;
    lastName: string;
    customerId: string;
    portfolioImg: string | null;
  } | null;
}) {
  if (!customer) {
    return (
      <Button asChild variant="outline" className="h-10 rounded-full px-4">
        <Link href="/customer/login">Log in</Link>
      </Button>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex size-10 items-center justify-center overflow-hidden rounded-full ring-2 ring-border transition hover:ring-primary/50"
          aria-label={`Account menu for ${customer.firstName}`}
        >
          <SnackImage src={avatarSrc(customer.portfolioImg)} alt="" size={40} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col">
          <span className="font-semibold">
            {customer.firstName} {customer.lastName}
          </span>
          <span className="truncate text-xs font-normal text-muted-foreground">
            {customer.customerId}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/customer/profile">
            <UserRound /> Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/customer/orders">
            <ReceiptText /> My orders
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={customerLogoutAction}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full">
              <LogOut /> Log out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
