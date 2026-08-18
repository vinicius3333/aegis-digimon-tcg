import type { Migration } from "../migrator.js";

export const accountAdmin: Migration = {
  id: "013-account-admin",
  up: async (db) => {
    await db.query("ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false");
    await db.query("UPDATE accounts SET is_admin=true WHERE lower(display_name)='vini'");
  },
};
