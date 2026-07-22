import Link from "next/link";
import { AppLogo, APP_TITLE_CLASS } from "@/components/app-logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Privacy — MyTO" };

export default function PrivacyPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/login" className="flex items-center gap-3">
            <AppLogo />
            <h1 className={APP_TITLE_CLASS}>MyTO</h1>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 space-y-4 px-4 py-8">
        <div>
          <h2 className="text-2xl font-semibold">Privacy</h2>
          <p className="text-muted-foreground text-sm">
            Plain language, not legalese. This is a small, independently-run project — here&apos;s
            what it does and doesn&apos;t do with your data.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="label-tag">What&apos;s collected</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>
              Your email and password (used only to sign you in — passwords are hashed by
              Supabase, our auth provider, and never stored or visible in plain text), an optional
              display name, and whatever you enter about your household: a name for your
              household, your time-off requests (titles, timestamps, notes), and your running
              balance.
            </p>
            <p>
              If you invite a partner, they see your display name, requests, and balance —
              nothing outside your own household is visible to anyone else using the app.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="label-tag">What it&apos;s used for</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>
              Running the app: signing you in, tracking your balance, showing your comparative
              stats, and generating your private calendar feed link if you turn that on. Nothing
              is used for advertising, and nothing is sold or shared with third parties.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="label-tag">Where it lives</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>
              The app is hosted on Vercel; the database and authentication run on Supabase. Both
              are mainstream infrastructure providers — your data isn&apos;t stored on any
              personal server.
            </p>
            <p>
              The calendar feed link (if you generate one) works like a shared secret — anyone
              who has the URL can view your household&apos;s approved time off, so treat it like a
              password and regenerate it from Settings if it ever leaks.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="label-tag">Cookies</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>
              Only a session cookie to keep you signed in. No analytics or ad-tracking cookies.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="label-tag">Deleting your data</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>
              You can delete your account at any time from{" "}
              <span className="font-medium">Settings → Danger zone</span>. This removes your
              login and profile immediately. Your partner&apos;s own balance and history stay
              intact — deleting your account doesn&apos;t erase time they&apos;ve already banked
              because of you.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="label-tag">Questions</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>
              This is a one-person project, not a company. If you have a question or a concern
              about your data, reach out directly to whoever shared this app with you.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
