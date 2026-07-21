import type { PtoCategory } from "@/lib/pto/categories";

export type Household = {
  id: string;
  name: string;
  timezone: string;
  use_it_or_lose_it_enabled: boolean;
  use_it_or_lose_it_days: number | null;
  overdraft_floor: number;
  peak_multiplier: number;
  peak_window_start: string;
  peak_window_end: string;
  calendar_feed_token: string;
  created_at: string;
};

export type Profile = {
  id: string;
  household_id: string | null;
  display_name: string | null;
  created_at: string;
};

export type Invitation = {
  id: string;
  household_id: string;
  invite_code: string;
  created_by: string;
  status: "pending" | "accepted" | "expired" | "revoked";
  expires_at: string;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
};

export type PtoBalance = {
  id: string;
  household_id: string;
  user_id: string;
  category: PtoCategory;
  current_balance: number;
  overdraft_floor_override: number | null;
  last_expired_at: string | null;
  updated_at: string;
};

export type PtoTransaction = {
  id: string;
  household_id: string;
  user_id: string;
  initiated_by: string;
  category: PtoCategory;
  transaction_type:
    | "request"
    | "credit_earned"
    | "trade"
    | "gift"
    | "adjustment"
    | "expiration";
  base_hours: number;
  multiplier: number;
  final_cost: number;
  status: "pending" | "approved" | "denied" | "completed" | "cancelled";
  note: string | null;
  occurred_at: string;
  created_at: string;
};

export type PtoConversion = {
  id: string;
  household_id: string;
  requested_by: string;
  from_category: PtoCategory;
  to_category: PtoCategory;
  hours: number;
  status: "pending_partner_approval" | "approved" | "denied" | "cancelled";
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
};
