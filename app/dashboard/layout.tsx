import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DashboardTitle } from "@/components/dashboard-title";
import { SignOutButton } from "@/components/sign-out-button";
import { CoffeeLink } from "@/components/coffee-link";
import { HighContrastToggle } from "@/components/high-contrast-toggle";
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

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-3">
          <DashboardTitle />
          <nav className="flex items-center gap-2">
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
            <HighContrastToggle />
            <SignOutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
        {children}
      </main>
      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-center px-4 py-3">
          <CoffeeLink />
        </div>
      </footer>
    </div>
  );
}
