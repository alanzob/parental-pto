import Link from "next/link";
import { AuthShell, AuthFooterLinks } from "@/components/brand/auth-shell";
import { MiniHowItWorks } from "@/components/how-it-works/mini-steps";
import { ImpactStats } from "@/components/impact-stats";
import { CoffeeLink } from "@/components/coffee-link";
import { HighContrastToggle } from "@/components/high-contrast-toggle";
import { getPublicStats } from "@/lib/stats";
import { LoginForm } from "./login-form";

// Otherwise Next statically prerenders this at build time and the impact
// stats freeze at whatever they were on the last deploy.
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const stats = await getPublicStats();

  return (
    <AuthShell>
      <p className="label-tag text-muted-foreground mb-3">How it works</p>
      <MiniHowItWorks />
      <p className="text-muted-foreground mt-3 text-xs">
        <Link href="/how-it-works" className="hover:text-foreground underline">
          Read the full walkthrough
        </Link>
      </p>

      <div className="my-6 border-t" />

      <LoginForm />

      <ImpactStats stats={stats} className="mt-6" />

      <AuthFooterLinks>
        <Link href="/about" className="hover:text-foreground underline">
          About
        </Link>
        <HighContrastToggle />
        <CoffeeLink />
      </AuthFooterLinks>
    </AuthShell>
  );
}
