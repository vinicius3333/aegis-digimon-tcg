import type { Migration } from "../migrator.js";

/** When the API last read the account's Discord avatar, so it can refresh a stale one without a new sign-in. */
export const accountAvatarCheckedAt: Migration = {
  id: "023-account-avatar-checked-at",
  up: "ALTER TABLE accounts ADD COLUMN IF NOT EXISTS avatar_checked_at bigint",
};
