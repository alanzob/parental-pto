import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { DashboardTitle } from "@/components/dashboard-title";
import { SignOutButton } from "@/components/sign-out-button";
import { CoffeeLink } from "@/components/coffee-link";
import { HighContrastToggle } from "@/components/high-contrast-toggle";
import { MobileNav, MobileNavLink, MobileNavRow } from "@/components/ui/mobile-nav";
import { buttonVariants } from "@/components/ui/button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("household_id")
    .eq("id", user.id)
    .single();

  if (!profile?.household_id) redirect("/onboarding");

  const isAdmin = isAdminEmail(user.email);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-3">
          <DashboardTitle />
          <nav className="hidden items-center gap-2 sm:flex">
            <Link
              href="/dashboard"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Dashboard
            </Link>
            <Link
              href="/dashboard/settings"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Settings
            </Link>
            <Link
              href="/how-it-works"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              How it works
            </Link>
            {isAdmin && (
              <Link
                href="/dashboard/admin"
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                Admin
              </Link>
            )}
            <HighContrastToggle />
            <SignOutButton />
          </nav>
          <div className="sm:hidden">
            <MobileNav label="Menu">
              <MobileNavLink href="/dashboard">Dashboard</MobileNavLink>
              <MobileNavLink href="/dashboard/settings">Settings</MobileNavLink>
              <MobileNavLink href="/how-it-works">How it works</MobileNavLink>
              {isAdmin && <MobileNavLink href="/dashboard/admin">Admin</MobileNavLink>}
              <MobileNavRow>
                <HighContrastToggle />
              </MobileNavRow>
              <MobileNavRow className="mt-2 border-t pt-3">
                <SignOutButton />
              </MobileNavRow>
            </MobileNav>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
        {children}
      </main>
      <footer className="border-t">
        <div className="text-muted-foreground mx-auto flex w-full max-w-4xl items-center justify-center gap-3 px-4 py-3 text-xs">
          <CoffeeLink />
          <Link href="/contact" className="hover:text-foreground underline">
            Tell us what you think
          </Link>
          <Link href="/privacy" className="hover:text-foreground underline">
            Privacy
          </Link>
        </div>
      </footer>
    </div>
  );
}
