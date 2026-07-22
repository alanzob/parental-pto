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
  /** 'manual' = a partner is being tracked without them actually using the
   * app — see manual_partner_name. Requests auto-approve in this mode since
   * there's nobody else to check them. */
  partner_mode: "invited" | "manual";
  manual_partner_name: string | null;
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

/** `user_id` is null for a household's manual (non-participating) partner —
 * see Household.partner_mode. */
export type PtoBalance = {
  id: string;
  household_id: string;
  user_id: string | null;
  current_balance: number;
  overdraft_floor_override: number | null;
  last_expired_at: string | null;
  updated_at: string;
};

/** A named request for time off. `user_id` is whose balance is CREDITED
 * (the partner covering for `initiated_by`), not who's taking the time —
 * approval by `user_id` adds `final_cost` hours to their own balance.
 * `user_id` is null when credited to a manual (non-participating) partner,
 * in which case the request is auto-approved (no one else to check it). */
export type PtoTransaction = {
  id: string;
  household_id: string;
  user_id: string | null;
  initiated_by: string;
  transaction_type: "request";
  title: string;
  base_hours: number;
  multiplier: number;
  final_cost: number;
  status: "pending" | "approved" | "denied" | "cancelled";
  note: string | null;
  /** Groups instances generated from one recurring series; null for one-offs. */
  series_id: string | null;
  occurred_at: string;
  created_at: string;
};
