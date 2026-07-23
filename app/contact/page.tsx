import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AppLogo, APP_TITLE_CLASS } from "@/components/app-logo";
import { SiteFooter } from "@/components/site-footer";
import { ContactForm } from "./contact-form";

export const metadata = { title: "Contact — MyTO" };

export default async function ContactPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
          <h2 className="text-2xl font-semibold">Contact</h2>
          <p className="text-muted-foreground text-sm">
            Bug, idea, or just a thought — this goes straight to the person building it.
          </p>
        </div>

        <ContactForm defaultEmail={user?.email ?? ""} />
      </main>

      <SiteFooter />
    </div>
  );
}
