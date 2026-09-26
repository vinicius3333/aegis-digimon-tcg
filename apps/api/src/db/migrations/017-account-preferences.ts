import type { Migration } from "../migrator.js";

export const accountPreferences: Migration = {
  id: "017-account-preferences",
  up: "ALTER TABLE accounts ADD COLUMN IF NOT EXISTS preferences jsonb NOT NULL DEFAULT '{}'::jsonb",
};
