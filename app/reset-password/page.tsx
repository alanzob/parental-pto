"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

type Status = "checking" | "ready" | "invalid";

export default function ResetPasswordPage() {
  const supabase = createClient();
  const router = useRouter();

  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // The recovery link either lands here with a PKCE `code` to exchange for
    // a session, or (rarely) with a session already established — either
    // way, no session means the link was invalid or already used.
    const code = new URLSearchParams(window.location.search).get("code");

    async function establishSession() {
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        setStatus(error ? "invalid" : "ready");
        return;
      }
      const { data } = await supabase.auth.getSession();
      setStatus(data.session ? "ready" : "invalid");
    }

    establishSession();
  }, [supabase]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated.");
    router.push("/dashboard");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Set a new password</CardTitle>
          <CardDescription>
            {status === "invalid"
              ? "This reset link is invalid or has already been used."
              : "Choose a new password for your account."}
          </CardDescription>
        </CardHeader>
        {status === "ready" && (
          <form onSubmit={submit}>
            <CardContent className="space-y-1.5">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Saving…" : "Update password"}
              </Button>
            </CardFooter>
          </form>
        )}
        {status === "invalid" && (
          <CardFooter>
            <a href="/login" className="text-sm underline">
              Back to sign in
            </a>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
