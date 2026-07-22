"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Off-canvas animated drawer for small screens — same Base UI Dialog
// primitives as components/ui/dialog.tsx, but slides in from the right
// instead of zooming in centered, since this is a nav menu, not a modal.
export function MobileNav({
  children,
  label = "Menu",
  triggerClassName,
}: {
  children: React.ReactNode;
  label?: string;
  triggerClassName?: string;
}) {
  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className={cn("size-10", triggerClassName)}
            aria-label={`Open ${label.toLowerCase()}`}
          />
        }
      >
        <Menu className="size-5" />
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          className="fixed inset-0 z-50 bg-black/20 duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
        />
        <DialogPrimitive.Popup
          className="bg-popover text-popover-foreground fixed inset-y-0 right-0 z-50 flex h-full w-72 max-w-[85vw] flex-col gap-1 border-l p-4 shadow-lg outline-none ring-1 ring-foreground/10 duration-200 data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right"
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="label-tag text-muted-foreground">{label}</p>
            <DialogPrimitive.Close
              render={
                <Button variant="ghost" size="icon" className="size-10" aria-label="Close menu" />
              }
            >
              <X className="size-5" />
            </DialogPrimitive.Close>
          </div>
          <nav className="flex flex-col gap-1">{children}</nav>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// A nav row that closes the drawer when tapped, since it's navigating away.
export function MobileNavLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <DialogPrimitive.Close
      nativeButton={false}
      render={<Link href={href} />}
      className={cn(
        "hover:bg-muted flex min-h-11 items-center rounded-lg px-3 text-base font-medium",
        className,
      )}
    >
      {children}
    </DialogPrimitive.Close>
  );
}

// A non-navigating row (e.g. wrapping a toggle) — same touch-friendly sizing,
// doesn't auto-close so the user can flip a setting and keep browsing the menu.
export function MobileNavRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-11 items-center justify-between px-3", className)}>
      {children}
    </div>
  );
}
