import Link from "next/link";
import { AppLogo, APP_TITLE_CLASS } from "@/components/app-logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SiteFooter } from "@/components/site-footer";
import { RELEASE_HISTORY } from "@/lib/release-history";

export const metadata = { title: "Release History — MyTO" };

export default function ReleaseHistoryPage() {
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
          <p className="label-tag text-muted-foreground mb-1">
            <Link href="/about" className="hover:text-foreground underline">
              About
            </Link>{" "}
            / Release History
          </p>
          <h2 className="text-2xl font-semibold">Release History</h2>
          <p className="text-muted-foreground text-sm">
            What shipped, and when. MyTO moves fast — this is the honest paper trail.
          </p>
        </div>

        <div className="relative space-y-4 border-l pl-6">
          {RELEASE_HISTORY.map((entry) => (
            <Card key={entry.date} className="relative">
              <span
                className="bg-primary absolute top-6 -left-[calc(1.5rem+4.5px)] size-2 rounded-full"
                aria-hidden="true"
              />
              <CardHeader>
                <CardTitle className="label-tag font-mono tabular-nums">
                  {entry.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1.5">
                  {entry.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-muted-foreground" aria-hidden="true">
                        —
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
