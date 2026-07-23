import Link from "next/link";
import { AppLogo, APP_TITLE_CLASS } from "@/components/app-logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { SiteFooter } from "@/components/site-footer";

export const metadata = { title: "About — MyTO" };

export default function AboutPage() {
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
          <h2 className="text-2xl font-semibold">About</h2>
          <p className="text-muted-foreground text-sm">
            Why this exists, and who&apos;s behind it.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="label-tag">The problem</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            <p>
              A few years ago, when it was just two kids, my wife and I made a deal: pick one
              night a week that&apos;s just yours, no explanation needed, no tallying what the
              other person &quot;owes&quot; you. It sounds small, but it did a lot — it kept some
              sense of my own identity intact, and as the kids got older and our community grew,
              it laid the groundwork for both of us to actually have social lives again.
            </p>
            <p>
              Now we&apos;re at three kids, 2nd grade down to a toddler, and the deal&apos;s still
              running — but it got harder to keep honest in my head. I take a trip out of state
              every year to see old friends; my wife doesn&apos;t get an equivalent chunk of time
              back for it. Nobody&apos;s keeping score out loud, but I feel that gap. I didn&apos;t
              want a scoreboard, exactly — I wanted a way to make the{" "}
              <span className="italic">absence</span>{" "}
              of equal time visible, so it doesn&apos;t quietly pile up before we notice and fix
              it.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="label-tag">The app</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>
              MyTO is a shared ledger for two people who trade off — log when one of you steps
              out, and the one covering banks the credit automatically. It&apos;s not about a
              rigid 50/50 split; it&apos;s just a quiet, visual record so neither of you is stuck
              doing the mental tallying alone.
            </p>
            <p>
              It&apos;s free, has no ads, and isn&apos;t a company — it&apos;s a one-person side
              project, built with Claude during nap times.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="label-tag">Built in the open</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            <p>
              MyTO ships fast and changes often — see what&apos;s shipped and when on the{" "}
              <Link href="/about/release-history" className="text-foreground underline">
                Release History
              </Link>{" "}
              page.
            </p>
            <Link
              href="/about/release-history"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              View release history
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="label-tag">Get in touch</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>
              Bug, idea, or just a thought — reach out on the{" "}
              <Link href="/contact" className="text-foreground underline">
                Contact
              </Link>{" "}
              page. It goes straight to me.
            </p>
          </CardContent>
        </Card>
      </main>

      <SiteFooter />
    </div>
  );
}
