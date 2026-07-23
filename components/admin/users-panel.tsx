"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export type AdminUserRow = {
  id: string;
  email: string | null;
  displayName: string | null;
  householdId: string | null;
  partnerMode: "invited" | "manual" | null;
  manualPartnerName: string | null;
  /** How many real accounts (not the manual partner) share this household. */
  memberCount: number;
  /** Display name/email of the other real member, if paired. */
  partnerLabel: string | null;
};

function HouseholdBadge({ u }: { u: AdminUserRow }) {
  if (!u.householdId) {
    return <span className="text-muted-foreground text-xs">Unpaired</span>;
  }
  if (u.partnerMode === "manual") {
    return (
      <span className="text-muted-foreground text-xs">
        Manual partner: {u.manualPartnerName ?? "unnamed"}
      </span>
    );
  }
  if (u.memberCount >= 2) {
    return (
      <span className="text-xs">
        Paired with <span className="font-medium">{u.partnerLabel ?? "someone"}</span>
      </span>
    );
  }
  return <span className="text-muted-foreground text-xs">Solo household, no partner yet</span>;
}

export function UsersPanel({ users }: { users: AdminUserRow[] }) {
  const router = useRouter();
  const [pairChoice, setPairChoice] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  async function callAction(path: string, body: object, rowId: string) {
    setBusyId(rowId);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error ?? "Something went wrong.");
        return;
      }
      router.refresh();
    } finally {
      setBusyId(null);
      setConfirmDeleteId(null);
    }
  }

  return (
    <Card>
      <CardContent className="divide-y p-0">
        {users.length === 0 && (
          <p className="text-muted-foreground py-8 text-center text-sm">No accounts yet.</p>
        )}
        {users.map((u) => {
          const otherUsers = users.filter((o) => o.id !== u.id);
          const isFull = u.householdId !== null && u.memberCount >= 2;
          return (
            <div key={u.id} className="space-y-2 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-mono text-sm">{u.email ?? "(no email)"}</p>
                  <p className="text-muted-foreground text-xs">{u.displayName ?? "—"}</p>
                </div>
                <HouseholdBadge u={u} />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {!isFull && otherUsers.length > 0 && (
                  <>
                    <Select
                      value={pairChoice[u.id] ?? ""}
                      onValueChange={(v) => setPairChoice((p) => ({ ...p, [u.id]: v ?? "" }))}
                    >
                      <SelectTrigger className="h-8 w-56 text-xs">
                        <SelectValue placeholder="Pair with…" />
                      </SelectTrigger>
                      <SelectContent>
                        {otherUsers.map((o) => (
                          <SelectItem key={o.id} value={o.id}>
                            {o.email ?? o.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!pairChoice[u.id] || busyId === u.id}
                      onClick={() =>
                        callAction(
                          "/api/admin/users/pair",
                          { userIdA: u.id, userIdB: pairChoice[u.id] },
                          u.id,
                        )
                      }
                    >
                      Pair
                    </Button>
                  </>
                )}

                {u.householdId && u.partnerMode !== "manual" && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === u.id}
                    onClick={() => callAction("/api/admin/users/unpair", { userId: u.id }, u.id)}
                  >
                    Unpair
                  </Button>
                )}

                {confirmDeleteId === u.id ? (
                  <span className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Delete {u.email}?</span>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busyId === u.id}
                      onClick={() => callAction("/api/admin/users/delete", { userId: u.id }, u.id)}
                    >
                      Confirm delete
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmDeleteId(null)}>
                      Cancel
                    </Button>
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive ml-auto"
                    onClick={() => setConfirmDeleteId(u.id)}
                  >
                    Delete
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
