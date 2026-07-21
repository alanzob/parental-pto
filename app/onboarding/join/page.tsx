import { redirect } from "next/navigation";

// Invite links point here (/onboarding/join?code=XXXX). Redirect into the
// main onboarding page with the code pre-filled so there's one form to
// maintain, but a distinct, memorable destination for the invite link.
export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  redirect(`/onboarding${code ? `?code=${encodeURIComponent(code)}` : ""}`);
}
