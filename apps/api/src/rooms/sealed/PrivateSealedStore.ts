import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import type { AccountStore } from "#api/accounts/AccountStore";
import { drawSealedPool } from "#api/sealed/drawSealedPool";
import { isSealedConfiguration } from "@aegis/shared/sealed/isSealedConfiguration";
import { getSealedConfiguration } from "@aegis/shared/sealed/getSealedConfiguration";
import { validateSealedDeck } from "@aegis/shared/sealed/validateSealedDeck";
import { PrivateSealedStatus as Status } from "@aegis/shared/sealed/private/PrivateSealedStatus";
import type {
  PrivateSealedView,
  PrivateSealedReady,
  PrivateSealedGameTicket,
  PrivateSealedRoomSlot,
} from "@aegis/shared/sealed/private/PrivateSealedContracts";
import type { SealedPull, SealedDeck, SealedConfiguration } from "@aegis/shared/sealed/SealedContracts";

type Owner = { credential: string; code: string; now?: number };
type Create = { credential: string; name: string; requestId: string; setId: string; now?: number };
type Join = Owner & { name: string };
type Ready = Owner & PrivateSealedReady;
type Start = Owner & {
  createRoom: (input: { code: string; gameId: string }) => Promise<string>;
  roomExists: (roomId: string) => Promise<boolean>;
  isRoomFinished?: (roomId: string) => Promise<boolean>;
  closeRoom?: (roomId: string) => Promise<void>;
};
type Authorization = { gameId: string; roomId: string; token: string };
type Result = { gameId: string; roomId: string; winner: 0 | 1 | null; now?: number };
type Seat = {
  credentialHash: string;
  name: string;
  packs: SealedPull[][];
  revision: number;
  readyWindow: string | null;
  submission: PrivateSealedReady | null;
  deck: SealedDeck | null;
};
type Game = {
  slot: PrivateSealedRoomSlot;
  revisions: [number, number];
  id: string;

  roomId: string | null;
  tokens: [string, string];
  decks: [SealedDeck, SealedDeck];
  finishedAt: number | null;
  winner: 0 | 1 | null;
};
type State = {
  version?: 2;
  configuration?: SealedConfiguration;
  status: PrivateSealedView["status"];
  seats: Seat[];
  score: [number, number];
  games: Game[];
  deadlineAt: number;
  winner: 0 | 1 | null;
  reason: string | null;
};
type Row = { code: string; state: State };

export class PrivateSealedStore {
  constructor(
    private readonly accounts: AccountStore,
    private readonly slot: PrivateSealedRoomSlot = getPrivateSealedSlot(),
  ) {}

  async create(input: Create): Promise<PrivateSealedView> {
    const configuration = getSealedConfiguration({ setId: input.setId });
    await this.accounts.ensureReady();
    const hash = getHash(input.credential);
    const requestId = input.requestId.toLowerCase();
    const client = await this.accounts.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
        `private-sealed:${hash}:${requestId}`,
      ]);
      const existing = (
        await client.query<Row>("SELECT code,state FROM private_sealed_series WHERE host_hash=$1 AND request_id=$2", [
          hash,
          requestId,
        ])
      ).rows[0];
      if (existing) {
        if (getConfiguration(existing.state).setId !== configuration.setId) {
          throw new Error("creation_conflict");
        }
        await client.query("COMMIT");
        return this.present(existing, input.credential, input.now ?? Date.now());
      }
      const now = input.now ?? Date.now();
      const state: State = {
        version: 2,
        configuration,
        status: Status.BUILDING.value,
        seats: [this.createSeat(input.credential, input.name, configuration)],
        score: [0, 0],
        games: [],
        deadlineAt: now + configuration.buildMinutes * 60000,
        winner: null,
        reason: null,
      };
      const code = randomBytes(9).toString("hex").toUpperCase();
      await client.query(
        "INSERT INTO private_sealed_series(id,code,host_hash,request_id,state) VALUES($1,$2,$3,$4,$5)",
        [randomUUID(), code, hash, requestId, JSON.stringify(state)],
      );
      await client.query("COMMIT");
      return this.present({ code, state }, input.credential, now);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async join(input: Join): Promise<PrivateSealedView> {
    return this.change(input.code, async (row) => {
      const now = input.now ?? Date.now();
      this.expire(row.state, now);
      if (this.findSeat(row.state, input.credential) < 0) {
        if (row.state.status !== Status.BUILDING.value) {
          throw new Error("series_closed");
        }
        if (row.state.seats.length >= 2) {
          throw new Error("room_full");
        }
        row.state.seats.push(this.createSeat(input.credential, input.name, getConfiguration(row.state)));
      }
      return this.present(row, input.credential, now);
    });
  }

  async view(input: Owner): Promise<PrivateSealedView> {
    return this.change(input.code, async (row) => {
      this.requireSeat(row.state, input.credential);
      this.expire(row.state, input.now ?? Date.now());
      return this.present(row, input.credential, input.now ?? Date.now());
    });
  }

  async ready(input: Ready): Promise<PrivateSealedView> {
    return this.change(input.code, async (row) => {
      const seat = row.state.seats[this.requireSeat(row.state, input.credential)]!;
      const now = input.now ?? Date.now();
      this.expire(row.state, now);
      const window = this.getWindow(row.state);
      const duplicate =
        seat.submission &&
        seat.submission.revision === input.revision &&
        seat.submission.window === input.window &&
        JSON.stringify(seat.submission.mainDeck) === JSON.stringify(input.mainDeck) &&
        JSON.stringify(seat.submission.eggDeck) === JSON.stringify(input.eggDeck);
      if (window === input.window && seat.readyWindow === window && duplicate) {
        return this.present(row, input.credential, now);
      }
      if (!window || input.window !== window || now >= row.state.deadlineAt) {
        throw new Error("window_closed");
      }
      if (seat.revision !== input.revision || seat.readyWindow === window) {
        throw new Error("stale_revision");
      }
      const legality = validateSealedDeck({
        pool: seat.packs.flat(),
        mainDeck: input.mainDeck,
        eggDeck: input.eggDeck,
      });
      if (!legality.ok) {
        throw new Error(legality.reason);
      }
      seat.submission = {
        mainDeck: input.mainDeck.slice(),
        eggDeck: input.eggDeck.slice(),
        revision: input.revision,
        window: input.window,
      };
      seat.revision++;
      seat.readyWindow = window;
      seat.deck = {
        mainDeck: legality.mainDeck,
        eggDeck: legality.eggDeck,
        mainDeckArts: legality.mainDeckArts,
        eggDeckArts: legality.eggDeckArts,
      };
      return this.present(row, input.credential, now);
    });
  }

  async start(input: Start): Promise<PrivateSealedGameTicket> {
    const allocation = await this.change(input.code, async (row) => {
      const seat = this.requireSeat(row.state, input.credential);
      const state = row.state;
      const now = input.now ?? Date.now();
      this.expire(state, now);
      const active = state.games.at(-1);
      if (state.status === Status.PLAYING.value && active) {
        if (!active.roomId) {
          throw new Error("game_starting");
        }
        if (active.slot === this.slot && !(await input.roomExists(active.roomId))) {
          state.status = Status.CANCELLED.value;
          state.reason = "game_interrupted";
          return null;
        }
        if (active.slot === this.slot && (await input.isRoomFinished?.(active.roomId))) {
          throw new Error("result_pending");
        }
        return { game: active, seat, created: false };
      }
      const window = this.getWindow(state);
      const expiredSideboard = state.status === Status.SIDEBOARDING.value && now >= state.deadlineAt;
      if (
        !window ||
        state.seats.length !== 2 ||
        state.seats.some((entry) => !entry.deck || (!expiredSideboard && entry.readyWindow !== window))
      ) {
        throw new Error("not_ready");
      }
      const decks = state.seats.map((entry) => structuredClone(entry.deck!)) as [SealedDeck, SealedDeck];
      const game: Game = {
        slot: this.slot,
        revisions: [state.seats[0]!.revision, state.seats[1]!.revision],
        id: randomUUID(),
        roomId: null,
        tokens: [randomBytes(32).toString("hex"), randomBytes(32).toString("hex")],
        decks,
        finishedAt: null,
        winner: null,
      };
      state.games.push(game);
      state.status = Status.PLAYING.value;
      state.deadlineAt = now + 60000;
      return { game, seat, created: true };
    });
    if (!allocation) {
      throw new Error("game_interrupted");
    }
    let roomId = allocation.game.roomId;
    if (allocation.created) {
      try {
        roomId = await input.createRoom({ code: input.code, gameId: allocation.game.id });
        const createdRoomId = roomId;
        await this.change(input.code, async (row) => {
          const game = row.state.games.at(-1);
          if (row.state.status !== Status.PLAYING.value || game?.id !== allocation.game.id || game.roomId) {
            throw new Error("series_closed");
          }
          game.roomId = createdRoomId;
        });
      } catch (error) {
        if (roomId) {
          await input.closeRoom?.(roomId);
        }
        await this.change(input.code, async (row) => {
          if (row.state.games.at(-1)?.id === allocation.game.id && row.state.status === Status.PLAYING.value) {
            row.state.status = Status.CANCELLED.value;
            row.state.reason = "game_interrupted";
          }
        });
        throw error;
      }
    }
    return {
      gameId: allocation.game.id,
      roomId: roomId!,
      slot: allocation.game.slot,
      token: allocation.game.tokens[allocation.seat],
    };
  }

  async authorize(input: Authorization): Promise<{ seat: 0 | 1; name: string; deck: SealedDeck }> {
    await this.accounts.ensureReady();
    const row = (
      await this.accounts.pool.query<Row>("SELECT code,state FROM private_sealed_series WHERE current_game_id=$1", [
        input.gameId,
      ])
    ).rows[0];
    const game = row?.state.games.at(-1);
    const seat = game?.tokens.findIndex((token) => token === input.token);
    if (
      !row ||
      row.state.status !== Status.PLAYING.value ||
      !game ||
      game.id !== input.gameId ||
      game.roomId !== input.roomId ||
      (seat !== 0 && seat !== 1)
    ) {
      throw new Error("game_not_authorized");
    }
    return { seat, name: row.state.seats[seat]!.name, deck: structuredClone(game.decks[seat]) };
  }

  async getCurrentGame(
    input: Owner,
  ): Promise<{ gameId: string; roomId: string | null; slot: PrivateSealedRoomSlot; finishedAt: number | null } | null> {
    await this.accounts.ensureReady();
    const row = (
      await this.accounts.pool.query<Row>("SELECT code,state FROM private_sealed_series WHERE code=$1", [input.code])
    ).rows[0];
    if (!row) {
      throw new Error("series_not_found");
    }
    this.requireSeat(row.state, input.credential);
    const game = row.state.games.at(-1);
    return game ? { gameId: game.id, roomId: game.roomId, slot: game.slot, finishedAt: game.finishedAt } : null;
  }

  async recordResult(input: Result): Promise<void> {
    await this.accounts.ensureReady();
    if (await this.hasRecordedResult(this.accounts.pool, input)) {
      return;
    }
    const found = (
      await this.accounts.pool.query<{ code: string }>(
        "SELECT code FROM private_sealed_series WHERE current_game_id=$1",
        [input.gameId],
      )
    ).rows[0];
    if (!found) {
      throw new Error("game_not_found");
    }
    await this.change(found.code, async (row, client) => {
      if (await this.hasRecordedResult(client, input)) {
        return;
      }
      const game = row.state.games.find((entry) => entry.id === input.gameId);
      if (!game || game.roomId !== input.roomId) {
        throw new Error("game_not_authorized");
      }
      const finishedAt = input.now ?? Date.now();
      await client.query(
        "INSERT INTO private_sealed_results(game_id,series_id,room_id,winner,finished_at) SELECT $1,id,$2,$3,$4 FROM private_sealed_series WHERE code=$5",
        [input.gameId, input.roomId, input.winner, finishedAt, row.code],
      );
      if (game.finishedAt !== null) {
        return;
      }
      game.finishedAt = finishedAt;
      game.winner = input.winner;
      if (row.state.status !== Status.PLAYING.value) {
        return;
      }
      if (input.winner !== null) {
        row.state.score[input.winner]++;
      }
      if (row.state.score.some((score) => score >= 2)) {
        row.state.status = Status.COMPLETE.value;
        row.state.winner = row.state.score[0] >= 2 ? 0 : 1;
      } else {
        row.state.status = Status.SIDEBOARDING.value;
        row.state.deadlineAt = game.finishedAt + getConfiguration(row.state).sideboardSeconds * 1000;
      }
    });
  }

  private async hasRecordedResult(db: Pick<PoolClient, "query">, input: Result): Promise<boolean> {
    const row = (
      await db.query<{ room_id: string; winner: number | null }>(
        "SELECT room_id,winner FROM private_sealed_results WHERE game_id=$1",
        [input.gameId],
      )
    ).rows[0];
    if (row && (row.room_id !== input.roomId || row.winner !== input.winner)) {
      throw new Error("result_conflict");
    }
    return row !== undefined;
  }

  async cancel(
    input: Owner & { interrupted?: boolean; closeRoom?: (roomId: string) => Promise<void> },
  ): Promise<PrivateSealedView> {
    const result = await this.change(input.code, async (row) => {
      const seat = this.requireSeat(row.state, input.credential);
      const active = row.state.games.at(-1);
      const roomId = active?.finishedAt === null ? active.roomId : null;
      if (![Status.COMPLETE.value, Status.CANCELLED.value].some((status) => row.state.status === status)) {
        row.state.status = Status.CANCELLED.value;
        row.state.reason = input.interrupted ? "game_interrupted" : "player_cancelled";
        row.state.winner = row.state.seats.length === 2 ? (seat === 0 ? 1 : 0) : null;
      }
      return { view: this.present(row, input.credential, input.now ?? Date.now()), roomId };
    });
    if (result.roomId) {
      await input.closeRoom?.(result.roomId);
    }
    return result.view;
  }

  private createSeat(credential: string, name: string, configuration: SealedConfiguration): Seat {
    return {
      credentialHash: getHash(credential),
      name,
      packs: drawSealedPool({ configuration }),
      revision: 0,
      readyWindow: null,
      submission: null,
      deck: null,
    };
  }
  private findSeat(state: State, credential: string): number {
    return state.seats.findIndex((seat) => seat.credentialHash === getHash(credential));
  }
  private requireSeat(state: State, credential: string): 0 | 1 {
    const seat = this.findSeat(state, credential);
    if (seat !== 0 && seat !== 1) {
      throw new Error("seat_required");
    }
    return seat;
  }
  private getWindow(state: State): string | null {
    if (state.status === Status.BUILDING.value || state.status === Status.SIDEBOARDING.value) {
      return `game:${state.games.length + 1}`;
    }
    return null;
  }
  private expire(state: State, now: number): void {
    if (state.status === Status.PLAYING.value && !state.games.at(-1)?.roomId && now >= state.deadlineAt) {
      state.status = Status.CANCELLED.value;
      state.reason = "game_interrupted";
    }

    if (
      state.status === Status.BUILDING.value &&
      now >= state.deadlineAt &&
      (state.seats.length < 2 || state.seats.some((seat) => !seat.deck))
    ) {
      state.status = Status.CANCELLED.value;
      state.reason = "build_timeout";
    }
  }
  private present(row: Row, credential: string, now: number): PrivateSealedView {
    const seat = this.requireSeat(row.state, credential);
    const own = row.state.seats[seat]!;
    const window = this.getWindow(row.state);
    return {
      code: row.code,
      seat,
      players: row.state.seats.map((entry) => entry.name),
      status: row.state.status,
      score: row.state.score,
      winner: row.state.winner,
      reason: row.state.reason,
      gameNumber: row.state.games.length + (window ? 1 : 0),
      pool: {
        configuration: getConfiguration(row.state),
        packs: own.packs,
        revision: own.revision,
        deck: own.submission,
        window,
        ready: window !== null && own.readyWindow === window,
        editable: window !== null && now < row.state.deadlineAt && own.readyWindow !== window,
        deadlineAt: window ? row.state.deadlineAt : null,
      },
      serverNow: now,
    };
  }
  private async change<T>(code: string, action: (row: Row, client: PoolClient) => Promise<T>): Promise<T> {
    await this.accounts.ensureReady();
    const client = await this.accounts.pool.connect();
    try {
      await client.query("BEGIN");
      const row = (
        await client.query<Row>("SELECT code,state FROM private_sealed_series WHERE code=$1 FOR UPDATE", [code])
      ).rows[0];
      if (!row) {
        throw new Error("series_not_found");
      }
      const result = await action(row, client);
      await client.query("UPDATE private_sealed_series SET state=$1,current_game_id=$3 WHERE code=$2", [
        JSON.stringify(row.state),
        code,
        row.state.games.at(-1)?.id ?? null,
      ]);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
function getHash(credential: string): string {
  return createHash("sha256").update(credential).digest("hex");
}

function getPrivateSealedSlot(): PrivateSealedRoomSlot {
  const slot = process.env.AEGIS_DEPLOYMENT_SLOT ?? "legacy";
  if (slot === "legacy" || slot === "blue" || slot === "red" || slot === "green" || /^g-[a-z0-9-]+$/.test(slot)) {
    return slot as PrivateSealedRoomSlot;
  }
  throw new Error("invalid_deployment_slot");
}

function getConfiguration(state: State): SealedConfiguration {
  if (state.version === undefined && state.configuration === undefined) {
    return getSealedConfiguration({ setId: "BT4" });
  }
  if (state.version !== 2 || !isSealedConfiguration(state.configuration)) {
    throw new Error("sealed_configuration_invalid");
  }
  return state.configuration;
}
