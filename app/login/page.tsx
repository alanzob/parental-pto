import { AuthShell } from "@/components/brand/auth-shell";
import { LoginLanding } from "@/components/login-landing";
import { getPublicStats } from "@/lib/stats";

// Otherwise Next statically prerenders this at build time and the impact
// stats freeze at whatever they were on the last deploy.
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const stats = await getPublicStats();

  return (
    <AuthShell>
      <LoginLanding stats={stats} />
    </AuthShell>
  );
}
