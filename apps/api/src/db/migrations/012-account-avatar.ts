import type { Migration } from "../migrator.js";

export const accountAvatar: Migration = {
  id: "012-account-avatar",
  up: "ALTER TABLE accounts ADD COLUMN IF NOT EXISTS avatar_id text",
};
