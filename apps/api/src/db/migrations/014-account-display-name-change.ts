import type { Migration } from "../migrator.js";

export const accountDisplayNameChange: Migration = {
  id: "014-account-display-name-change",
  up: "ALTER TABLE accounts ADD COLUMN IF NOT EXISTS display_name_changed_at bigint",
};
