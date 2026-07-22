"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AuthShell } from "@/components/brand/auth-shell";
import { QuickStartFlow } from "./quick-start-flow";
import { toast } from "sonner";

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CODE: "That invite code doesn't exist. Double-check it with your partner.",
  CODE_ALREADY_USED: "This invite link has already been used.",
  CODE_EXPIRED: "This invite link has expired — ask your partner to send a new one.",
  ALREADY_IN_HOUSEHOLD: "You already belong to a household.",
  HOUSEHOLD_FULL: "This household already has two members.",
};

function friendlyError(message: string): string {
  const code = message.split(":")[0]?.trim();
  return ERROR_MESSAGES[code] ?? message;
}

export function OnboardingForm({ initialCode }: { initialCode?: string }) {
  const supabase = createClient();
  const [householdName, setHouseholdName] = useState("Our Household");
  const [code, setCode] = useState(initialCode ?? "");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  async function createHousehold(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const { error } = await supabase.rpc("create_household", {
      p_name: householdName,
    });
    setCreating(false);
    if (error) {
      toast.error(friendlyError(error.message));
      return;
    }
    window.location.href = "/dashboard";
  }

  async function joinHousehold(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setJoining(true);
    const { error } = await supabase.rpc("redeem_invite", {
      p_invite_code: code.trim(),
    });
    setJoining(false);
    if (error) {
      toast.error(friendlyError(error.message));
      return;
    }
    toast.success("You're in! Welcome to the household.");
    window.location.href = "/dashboard";
  }

  return (
    <AuthShell spec={["Step 1 of 1", "Pair your household", "Two people, one ledger"]}>
      <p className="label-tag text-muted-foreground mb-2">Set up</p>
      <h2 className="font-heading mb-1 text-2xl font-medium">Set up your household</h2>
      <p className="text-muted-foreground mb-5 text-sm">
        Quick start sets up both of you at once — or create solo and invite later, or join with a
        code.
      </p>
      <Tabs defaultValue={initialCode ? "join" : "quick-start"}>
            <TabsList className="w-full">
              <TabsTrigger value="quick-start" className="flex-1">
                Quick start
              </TabsTrigger>
              <TabsTrigger value="create" className="flex-1">
                Create
              </TabsTrigger>
              <TabsTrigger value="join" className="flex-1">
                Join
              </TabsTrigger>
            </TabsList>
            <TabsContent value="quick-start">
              <QuickStartFlow />
            </TabsContent>
            <TabsContent value="create">
              <form onSubmit={createHousehold} className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="household-name">Household name</Label>
                  <Input
                    id="household-name"
                    value={householdName}
                    onChange={(e) => setHouseholdName(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={creating}>
                  {creating ? "Creating…" : "Create household"}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="join">
              <form onSubmit={joinHousehold} className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="invite-code">Invite code</Label>
                  <Input
                    id="invite-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Paste the code your partner sent"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={joining}>
                  {joining ? "Joining…" : "Join household"}
                </Button>
              </form>
            </TabsContent>
      </Tabs>
    </AuthShell>
  );
}
