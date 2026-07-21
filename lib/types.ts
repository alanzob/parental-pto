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
  current_balance: number;
  overdraft_floor_override: number | null;
  last_expired_at: string | null;
  updated_at: string;
};

/** A named request for time off. `user_id` is whose balance is CREDITED
 * (the partner covering for `initiated_by`), not who's taking the time —
 * approval by `user_id` adds `final_cost` hours to their own balance. */
export type PtoTransaction = {
  id: string;
  household_id: string;
  user_id: string;
  initiated_by: string;
  transaction_type: "request";
  title: string;
  base_hours: number;
  multiplier: number;
  final_cost: number;
  status: "pending" | "approved" | "denied";
  note: string | null;
  occurred_at: string;
  created_at: string;
};
