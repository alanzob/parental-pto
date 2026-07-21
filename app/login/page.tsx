"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

export default function LoginPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [linkSent, setLinkSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "auth_link_failed") {
      toast.error(
        "That sign-in link didn't work — likely opened in a different browser than you requested it from. Try the 6-digit code instead.",
      );
      window.history.replaceState(null, "", "/login");
    }
  }, []);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSending(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setLinkSent(true);
    toast.success("Check your email for a sign-in link or code.");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!code) return;
    setVerifying(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });
    setVerifying(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    window.location.href = "/dashboard";
  }

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Parental PTO</CardTitle>
          <CardDescription>
            Sign in with a magic link — no password needed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={sendLink} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <Button type="submit" className="w-full" disabled={sending}>
              {sending ? "Sending…" : "Send magic link"}
            </Button>
          </form>

          {linkSent && (
            <form onSubmit={verifyCode} className="space-y-3 border-t pt-4">
              <div className="space-y-1.5">
                <Label htmlFor="code">
                  Or enter the 6-digit code from the email
                </Label>
                <Input
                  id="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                />
              </div>
              <Button
                type="submit"
                variant="secondary"
                className="w-full"
                disabled={verifying}
              >
                {verifying ? "Verifying…" : "Verify code"}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex-col items-start gap-2">
          <p className="text-muted-foreground text-xs">
            Opening the link on a different device or browser than you
            requested it from won&apos;t work — use the code instead.
          </p>
          <p className="text-sm">
            Just want to see it in action?{" "}
            <Link href="/demo" className="underline">
              Try the demo
            </Link>{" "}
            — no login needed.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
