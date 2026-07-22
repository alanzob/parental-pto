import { redirect } from "next/navigation";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !process.env.ADMIN_EMAIL || user.email !== process.env.ADMIN_EMAIL) {
    redirect("/dashboard");
  }

  const serviceClient = createServiceRoleClient();
  const { data: errors } = await serviceClient
    .from("error_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Admin — error log</h2>
        <p className="text-muted-foreground text-sm">Last 100 reported errors, newest first.</p>
      </div>

      {!errors || errors.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center text-sm">
            No errors reported yet.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {errors.map((e) => (
              <div key={e.id} className="space-y-1 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono text-sm font-medium">{e.message}</p>
                  <span className="text-muted-foreground shrink-0 font-mono text-xs">
                    {new Date(e.created_at).toLocaleString()}
                  </span>
                </div>
                {e.path && <p className="text-muted-foreground font-mono text-xs">{e.path}</p>}
                {e.stack && (
                  <pre className="bg-muted overflow-x-auto rounded p-2 text-[10px] leading-snug">
                    {e.stack}
                  </pre>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
