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
  category_weight_day: number;
  category_weight_morning: number;
  category_weight_afternoon: number;
  category_weight_evening: number;
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
  /** Null when logged on behalf of a manual (unsigned-up) partner, or when
   * the original requester's account has since been deleted. */
  initiated_by: string | null;
  transaction_type: "request";
  title: string;
  /** null on legacy pre-0008 rows; every new request has one. 'trip' means
   * a multi-day span — see departure_period/return_period. 'custom' means a
   * self-described entry with its own point value — see custom_weight. */
  category: import("@/lib/pto/categories").OffCategory | "trip" | "custom" | null;
  base_hours: number;
  multiplier: number;
  /** The credited amount, now in points (the category weight). */
  final_cost: number;
  status: "pending" | "approved" | "denied" | "cancelled";
  note: string | null;
  /** Groups instances generated from one recurring series; null for one-offs. */
  series_id: string | null;
  /** Set together, only when category = 'trip'. */
  departure_period: import("@/lib/pto/trip").TripPeriod | null;
  return_period: import("@/lib/pto/trip").TripPeriod | null;
  /** The user-chosen point value, only when category = 'custom' — equal to
   * final_cost at creation, kept separately so editing can tell "custom" and
   * "picked a preset that happens to weigh the same" apart. */
  custom_weight: number | null;
  occurred_at: string;
  created_at: string;
};
