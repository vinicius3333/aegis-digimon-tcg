import type { Migration } from "../migrator.js";

// Verbatim extraction of the DDL that AccountStore.initialize() used to run inline. `IF NOT EXISTS`
// is kept so installations created before the migrator existed adopt it without recreating anything.
export const initialSchema: Migration = {
  id: "001-initial-schema",
  up: `
    CREATE TABLE IF NOT EXISTS accounts (id uuid PRIMARY KEY, display_name varchar(32) NOT NULL, avatar_url text, created_at bigint NOT NULL);
    CREATE UNIQUE INDEX IF NOT EXISTS accounts_display_name_unique ON accounts(lower(display_name));
    CREATE TABLE IF NOT EXISTS login_identities (provider text NOT NULL, subject text NOT NULL, account_id uuid NOT NULL REFERENCES accounts(id), PRIMARY KEY(provider, subject));
    CREATE TABLE IF NOT EXISTS sessions (id text PRIMARY KEY, account_id uuid NOT NULL REFERENCES accounts(id), expires_at bigint NOT NULL, revoked_at bigint);
    CREATE TABLE IF NOT EXISTS magic_links (token_hash text PRIMARY KEY, email text NOT NULL, expires_at bigint NOT NULL, consumed_at bigint);
    CREATE TABLE IF NOT EXISTS saved_decks (id text NOT NULL, account_id uuid NOT NULL REFERENCES accounts(id), name text NOT NULL, main_deck jsonb NOT NULL, egg_deck jsonb NOT NULL, revision integer NOT NULL, updated_at bigint NOT NULL, PRIMARY KEY(account_id, id));
    CREATE TABLE IF NOT EXISTS match_records (id uuid PRIMARY KEY, room_id text NOT NULL UNIQUE, mode text NOT NULL CHECK (mode IN ('ranked','tournament')), player0_account_id uuid NOT NULL REFERENCES accounts(id), player1_account_id uuid NOT NULL REFERENCES accounts(id), winner_account_id uuid REFERENCES accounts(id), reason text NOT NULL, finished_at bigint NOT NULL);
    CREATE TABLE IF NOT EXISTS player_stats (account_id uuid PRIMARY KEY REFERENCES accounts(id), ranked_wins integer NOT NULL DEFAULT 0, ranked_losses integer NOT NULL DEFAULT 0, ranked_draws integer NOT NULL DEFAULT 0, ranked_dodges integer NOT NULL DEFAULT 0, tournament_wins integer NOT NULL DEFAULT 0, tournament_losses integer NOT NULL DEFAULT 0, tournament_draws integer NOT NULL DEFAULT 0, tournaments_played integer NOT NULL DEFAULT 0, tournaments_won integer NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS ranked_dodge_records (room_id text NOT NULL, account_id uuid NOT NULL REFERENCES accounts(id), created_at bigint NOT NULL, PRIMARY KEY(room_id, account_id));
    CREATE TABLE IF NOT EXISTS match_deck_snapshots (match_id uuid NOT NULL REFERENCES match_records(id), account_id uuid NOT NULL REFERENCES accounts(id), snapshot_id text NOT NULL, deck_id text, deck_name text NOT NULL, main_deck jsonb NOT NULL, egg_deck jsonb NOT NULL, result text NOT NULL CHECK (result IN ('win','loss','draw')), PRIMARY KEY(match_id, account_id));
    CREATE TABLE IF NOT EXISTS tournaments (id uuid PRIMARY KEY, name text NOT NULL, block text NOT NULL, status text NOT NULL CHECK (status IN ('registration','in_progress','finished')), starts_at bigint NOT NULL, max_players integer NOT NULL, created_by uuid NOT NULL REFERENCES accounts(id), winner_account_id uuid REFERENCES accounts(id), created_at bigint NOT NULL);
    CREATE TABLE IF NOT EXISTS tournament_registrations (tournament_id uuid NOT NULL REFERENCES tournaments(id), account_id uuid NOT NULL REFERENCES accounts(id), seed integer, created_at bigint NOT NULL, PRIMARY KEY(tournament_id, account_id));
    CREATE TABLE IF NOT EXISTS tournament_matches (id uuid PRIMARY KEY, tournament_id uuid NOT NULL REFERENCES tournaments(id), round integer NOT NULL, position integer NOT NULL, player0_account_id uuid REFERENCES accounts(id), player1_account_id uuid REFERENCES accounts(id), winner_account_id uuid REFERENCES accounts(id), status text NOT NULL CHECK (status IN ('waiting','pending','finished','bye')), room_id text UNIQUE, UNIQUE(tournament_id, round, position));
    CREATE TABLE IF NOT EXISTS room_tickets (token_hash text PRIMARY KEY, account_id uuid NOT NULL REFERENCES accounts(id), tournament_match_id uuid REFERENCES tournament_matches(id), expires_at bigint NOT NULL, consumed_at bigint);
    CREATE INDEX IF NOT EXISTS saved_decks_account ON saved_decks(account_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS match_records_players ON match_records(player0_account_id, player1_account_id, finished_at DESC);
    CREATE INDEX IF NOT EXISTS match_deck_snapshots_account ON match_deck_snapshots(account_id, snapshot_id);
  `,
};
