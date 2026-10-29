import type { Migration } from "#api/db/migrator";

/**
 * An uploaded profile picture lives in the row itself: no path a player can name, nothing to keep in
 * sync with a volume, and deleting the account deletes the bytes. `version` changes on every upload
 * so the public URL can be cached immutably.
 */
export const accountAvatarImage: Migration = {
  id: "051-account-avatar-image",
  up: async (db) => {
    for (const column of ["avatar_image bytea", "avatar_image_type text", "avatar_image_version bigint"])
      await db.query(`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS ${column}`);
  },
};
