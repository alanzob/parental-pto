import { AuthShell } from "@/components/brand/auth-shell";
import { LoginLanding } from "@/components/login-landing";
import { getPublicStats } from "@/lib/stats";
import { lookupInvitePreview } from "@/lib/invite";

// Otherwise Next statically prerenders this at build time and the impact
// stats freeze at whatever they were on the last deploy.
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const [stats, invite] = await Promise.all([
    getPublicStats(),
    code ? lookupInvitePreview(code) : Promise.resolve(null),
  ]);

  return (
    <AuthShell>
      <LoginLanding stats={stats} code={code} invite={invite} />
    </AuthShell>
  );
}
