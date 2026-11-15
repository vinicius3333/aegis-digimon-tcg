import { readSealedMatchPreparation } from "#api/tournaments/sealed/readSealedMatchPreparation";
import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import type { AccountStore } from "#api/accounts/AccountStore";
import type { Queryable } from "#api/db/migrator";
import { appendTournamentEvent } from "#api/tournaments/audit/TournamentEventLog";
import type { ParticipantDeckSnapshot } from "#api/tournaments/participants/ParticipantStore";
import type {
  SealedConfiguration,
  SealedDeckInput,
  SealedOwnPool,
  SealedPull,
} from "@aegis/shared/sealed/SealedContracts";
import { validateSealedDeck } from "@aegis/shared/sealed/validateSealedDeck";

type Owner = { tournamentId: string; accountId: string; now?: number };
type Submission = Owner & SealedDeckInput & { window: string };
type Result = { ok: true; revision: number } | { ok: false; reason: string };
type PoolRow = {
  participant_id: string;
  packs: SealedPull[][];
  revision: number;
  ready_window: string | null;
  status: string;
  event_status: string;
  sealed_configuration: SealedConfiguration;
  sealed_build_deadline_at: string | null;
  submission: SealedDeckInput | null;
};
type BuildWindow = { key: string; deadlineAt: number; editable: boolean };

export class SealedStore {
  constructor(private readonly accounts: AccountStore) {}

  async getOwnPool(input: Owner): Promise<SealedOwnPool | null> {
    await this.accounts.ensureReady();
    const row = await this.readOwner(this.accounts.pool, input);
    if (!row) {
      return null;
    }
    const window = await this.readWindow(this.accounts.pool, row, input);
    return {
      window: window?.key ?? null,
      configuration: row.sealed_configuration,
      packs: row.packs,
      revision: row.revision,
      deck: row.submission,
      ready: window !== null && row.ready_window === window.key,
      editable: window?.editable === true && row.ready_window !== window.key,
      deadlineAt: window?.deadlineAt ?? null,
    };
  }

  async ready(input: Submission): Promise<Result> {
    await this.accounts.ensureReady();
    const client = await this.accounts.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT id FROM tournaments WHERE id=$1 FOR UPDATE", [input.tournamentId]);
      const result = await this.submit(client, input);
      await client.query(result.ok ? "COMMIT" : "ROLLBACK");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async submit(client: PoolClient, input: Submission): Promise<Result> {
    const row = await this.readOwner(client, input);
    if (!row) {
      return { ok: false, reason: "sealed_pool_not_found" };
    }
    const submission = { mainDeck: input.mainDeck, eggDeck: input.eggDeck, revision: input.revision };
    const duplicate =
      row.ready_window === input.window &&
      row.revision === input.revision + 1 &&
      row.submission?.revision === submission.revision &&
      JSON.stringify(row.submission.mainDeck) === JSON.stringify(submission.mainDeck) &&
      JSON.stringify(row.submission.eggDeck) === JSON.stringify(submission.eggDeck);
    if (duplicate) {
      return { ok: true, revision: row.revision };
    }
    const window = await this.readWindow(client, row, input, true);
    if (!window?.editable || window.key !== input.window) {
      return { ok: false, reason: "sealed_window_closed" };
    }
    if (row.revision !== input.revision) {
      return { ok: false, reason: "stale_revision" };
    }
    if (row.ready_window === window.key) {
      return { ok: false, reason: "sealed_ready_locked" };
    }
    const legality = validateSealedDeck({ pool: row.packs.flat(), mainDeck: input.mainDeck, eggDeck: input.eggDeck });
    if (!legality.ok) {
      return legality;
    }
    const revision = row.revision + 1;
    const snapshot: ParticipantDeckSnapshot = {
      deckId: null,
      name: "Sealed",
      mainDeck: legality.mainDeck,
      eggDeck: legality.eggDeck,
      mainDeckArts: legality.mainDeckArts,
      eggDeckArts: legality.eggDeckArts,
      revision,
    };
    await client.query(
      "INSERT INTO tournament_sealed_decks (participant_id,revision,window_key,submission,snapshot,submitted_at) VALUES ($1,$2,$3,$4,$5,$6)",
      [
        row.participant_id,
        revision,
        window.key,
        JSON.stringify(submission),
        JSON.stringify(snapshot),
        input.now ?? Date.now(),
      ],
    );
    await client.query("UPDATE tournament_sealed_pools SET revision=$1,ready_window=$2 WHERE participant_id=$3", [
      revision,
      window.key,
      row.participant_id,
    ]);
    await client.query("UPDATE tournament_participants SET deck_snapshot=$1,deck_version=$2 WHERE id=$3", [
      JSON.stringify(snapshot),
      createHash("sha256").update(JSON.stringify(snapshot)).digest("hex"),
      row.participant_id,
    ]);
    await appendTournamentEvent(client, {
      tournamentId: input.tournamentId,
      actorKind: "participant",
      actorId: input.accountId,
      command: "sealed_deck_ready",
      commandId: `sealed_ready:${row.participant_id}:${revision}`,
      reason: "Participant locked a pool-constrained deck",
      reasonCode: "sealed_deck_ready",
      subjectKind: "participant",
      subjectId: row.participant_id,
      after: { revision, window: window.key },
      now: input.now ?? Date.now(),
    });
    return { ok: true, revision };
  }

  private async readOwner(db: Queryable, input: Owner): Promise<PoolRow | undefined> {
    return (
      await db.query<PoolRow>(
        `SELECT sp.participant_id,sp.packs,sp.revision,sp.ready_window,p.status,t.status event_status,t.sealed_configuration,t.sealed_build_deadline_at,d.submission
      FROM tournament_sealed_pools sp JOIN tournament_participants p ON p.id=sp.participant_id
      JOIN tournaments t ON t.id=p.tournament_id
      LEFT JOIN tournament_sealed_decks d ON d.participant_id=sp.participant_id AND d.revision=sp.revision
      WHERE p.tournament_id=$1 AND p.account_id=$2`,
        [input.tournamentId, input.accountId],
      )
    ).rows[0];
  }

  private async readWindow(db: Queryable, row: PoolRow, input: Owner, lock = false): Promise<BuildWindow | null> {
    const now = input.now ?? Date.now();
    if (row.status !== "active" || !["check_in", "in_progress"].includes(row.event_status)) {
      return null;
    }
    if (row.event_status === "check_in" && row.sealed_build_deadline_at !== null) {
      const deadlineAt = Number(row.sealed_build_deadline_at);
      return { key: "initial", deadlineAt, editable: now < deadlineAt };
    }
    const match = (
      await db.query<{ id: string; series_deadline_at: string | null }>(
        `SELECT s.id,s.series_deadline_at FROM match_series s JOIN tournament_matches m ON m.id=s.tournament_match_id WHERE m.tournament_id=$1 AND (m.player0_account_id=$2 OR m.player1_account_id=$2) AND s.status='playing' ORDER BY s.started_at DESC LIMIT 1${lock ? " FOR UPDATE OF s" : ""}`,
        [input.tournamentId, input.accountId],
      )
    ).rows[0];
    const matchPreparation = await readSealedMatchPreparation({
      db,
      tournamentId: input.tournamentId,
      accountId: input.accountId,
      sideboardSeconds: row.sealed_configuration.sideboardSeconds,
    });
    if (!match) {
      return matchPreparation ? { ...matchPreparation, editable: now < matchPreparation.deadlineAt } : null;
    }
    const games = (
      await db.query<{ game_index: number; status: string; finished_at: string | null }>(
        "SELECT game_index,status,finished_at FROM tournament_games WHERE series_id=$1 ORDER BY game_index DESC",
        [match.id],
      )
    ).rows;
    if (games.some((game) => ["allocated", "room_claimed", "playing"].includes(game.status))) {
      return null;
    }
    const last = games[0];
    if (!last?.finished_at) {
      if (!matchPreparation) {
        return null;
      }
      const deadlineAt = Math.min(
        matchPreparation.deadlineAt,
        match.series_deadline_at === null ? Infinity : Number(match.series_deadline_at),
      );
      return { key: matchPreparation.key, deadlineAt, editable: now < deadlineAt };
    }
    let deadlineAt = Number(last.finished_at) + row.sealed_configuration.sideboardSeconds * 1000;
    if (match.series_deadline_at !== null) {
      deadlineAt = Math.min(deadlineAt, Number(match.series_deadline_at));
    }
    return { key: `${match.id}:${Number(last.game_index) + 1}`, deadlineAt, editable: now < deadlineAt };
  }
}
