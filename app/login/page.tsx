"use client";

import { useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CoffeeLink } from "@/components/coffee-link";
import { HighContrastToggle } from "@/components/high-contrast-toggle";
import { toast } from "sonner";

export default function LoginPage() {
  const supabase = createClient();
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signingUp, setSigningUp] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setSigningIn(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: signInEmail,
      password: signInPassword,
    });
    setSigningIn(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    window.location.href = "/dashboard";
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    if (signUpPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setSigningUp(true);

    // Created pre-confirmed via the server (Admin API), so this never
    // touches Supabase's email pipeline — see app/api/auth/signup/route.ts.
    const signupRes = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: signUpEmail, password: signUpPassword }),
    });
    const signupBody = await signupRes.json();

    if (!signupRes.ok) {
      setSigningUp(false);
      toast.error(signupBody.error ?? "Could not create account.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: signUpEmail,
      password: signUpPassword,
    });
    setSigningUp(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    window.location.href = "/dashboard";
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Parental PTO</CardTitle>
          <CardDescription>Sign in or create an account.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin">
            <TabsList className="w-full">
              <TabsTrigger value="signin" className="flex-1">
                Sign in
              </TabsTrigger>
              <TabsTrigger value="signup" className="flex-1">
                Create account
              </TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={signIn} className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={signingIn}>
                  {signingIn ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={signUp} className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    placeholder="At least 6 characters"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={signingUp}>
                  {signingUp ? "Creating…" : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter>
          <p className="text-sm">
            Just want to see it in action?{" "}
            <Link href="/demo" className="underline">
              Try the demo
            </Link>{" "}
            — no login needed.
          </p>
        </CardFooter>
      </Card>
      <div className="flex items-center gap-3">
        <HighContrastToggle />
        <CoffeeLink />
      </div>
    </div>
  );
}
