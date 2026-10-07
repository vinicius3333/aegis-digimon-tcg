import type { Migration } from "../migrator.js";

/**
 * `hidden` joins the public deck statuses: a moderator sets it after a player report, and only a
 * moderator lifts it. The reports themselves live on GitHub, not here.
 */
export const publicDeckHiddenStatus: Migration = {
  id: "022-public-deck-hidden-status",
  up: "ALTER TABLE public_decks ADD CONSTRAINT public_decks_status_check CHECK (status IN ('public', 'unpublished', 'hidden'))",
};
