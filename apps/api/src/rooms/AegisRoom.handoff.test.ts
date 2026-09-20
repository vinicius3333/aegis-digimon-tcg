import type { Client } from "colyseus";
import { createHash } from "node:crypto";
import { GameState, Phase, PlayerState, type ServerEvent } from "@aegis/shared";
import type { AccountStore } from "../accounts/AccountStore.js";
import type {
  RoomCheckpointRecord,
  RoomCommandRecord,
  RoomHandoffStore,
  RoomSessionRecord,
  RoomTransferRecord,
} from "../db/roomHandoff/RoomHandoffStore.js";
import type { RoomCodeDirectory } from "../cluster/roomCodes.js";
import type { GameEngine } from "../engine/GameEngine.js";
import type { SeriesStore } from "../tournaments/series/SeriesStore.js";
import { createLocalRoomCodeDirectory } from "../cluster/roomCodes.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AegisRoom, setRoomCodeDirectory as roomCodeDirectorySetter } from "./AegisRoom.js";
import { RoomHandoffLifecycle } from "./RoomHandoffLifecycle.js";
import { exportStoppedMainBoundary } from "./handoff/experiment.js";
import { createMigrationPauseReceipt, resultEffectIdempotencyKey } from "./handoff/stage5Primitives.js";

const EMPTY_DECK = { mainDeck: [], eggDeck: [] };
const client = (sessionId: string): Client =>
  ({ sessionId, send: vi.fn<() => void>(), view: undefined }) as unknown as Client;

class HandoffTestRoom extends AegisRoom {
  readonly releaseTournamentRoom = vi.fn<() => Promise<void>>(async () => undefined);
  readonly recordMatch = vi.fn(async () => true);
  readonly recordTournamentRoomDraw = vi.fn(async () => true);
  readonly recordTournamentRoomResult = vi.fn(async () => true);
  readonly rebindGameRoom = vi.fn(async () => ({
    ok: true as const,
    value: { gameId: "game-1", roomId: "destination-room", replayed: false },
  }));
  readonly compensateDeadline = vi.fn(async () => ({ ok: true as const, value: {} }));
  readonly seriesForGame = vi.fn(async () => ({
    id: "series-1",
    matchId: "tournament-match-1",
    seriesDeadlineAt: 50_000,
  }));
  readonly handoffStore: RoomHandoffStore;

  constructor(handoffStore = fakeStore()) {
    super();
    this.handoffStore = handoffStore;
  }

  protected override roomHandoffStore(): RoomHandoffStore {
    return this.handoffStore;
  }

  protected override accounts(): AccountStore {
    return {
      releaseTournamentRoom: this.releaseTournamentRoom,
      recordMatch: this.recordMatch,
      recordTournamentRoomDraw: this.recordTournamentRoomDraw,
      recordTournamentRoomResult: this.recordTournamentRoomResult,
    } as unknown as AccountStore;
  }

  protected override series(): SeriesStore {
    return {
      rebindGameRoomForHandoff: this.rebindGameRoom,
      seriesForGame: this.seriesForGame,
      compensateSeriesDeadline: this.compensateDeadline,
    } as unknown as SeriesStore;
  }
}

describe("AegisRoom handoff barriers", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    setRoomCodeDirectory(createLocalRoomCodeDirectory());
  });

  it("keeps a prepared destination inert until an explicit activation", async () => {
    const room = await makeRoom({ handoffPrepared: true });
    const accepted = await room.onAuth(client("new-client"), { displayName: "A", deck: EMPTY_DECK });

    expect(accepted).toBe(false);
    expect(internals(room).handoffAuthority.mode).toBe("prepared");
    expect(internals(room).matchStartRequested).toBe(false);
  });

  it("does not let a caller forge the prepared-room bypass without a one-time reservation", async () => {
    const room = new HandoffTestRoom();
    await expect(room.onCreate({ handoffPrepared: true, handoffOwnerEpoch: 99 })).rejects.toMatchObject({ code: 403 });
  });

  it("creates a logical session from stable account identities rather than socket ids", async () => {
    const room = await makeRoom();
    const first = client("transport-a");
    const second = client("transport-b");
    const roomInternals = internals(room);
    roomInternals.accountByClient.set(first.sessionId, "account-a");
    roomInternals.accountByClient.set(second.sessionId, "account-b");
    room.clients.push(first, second);

    room.onJoin(first, { displayName: "A", deck: EMPTY_DECK });
    room.onJoin(second, { displayName: "B", deck: EMPTY_DECK });
    await roomInternals.ensureLogicalSession();

    const createSession = room.handoffStore.createSession as unknown as ReturnType<typeof vi.fn>;
    expect(createSession).toHaveBeenCalledOnce();
    expect(createSession.mock.calls[0]?.[0].participants).toEqual([
      { seat: 0, kind: "account", principalId: "account-a" },
      { seat: 1, kind: "account", principalId: "account-b" },
    ]);
    expect(createSession.mock.calls[0]?.[0].sessionId).toBe(room.state.matchLogId);
    expect(room.state.matchId).toBe(room.state.matchLogId);
    expect(JSON.stringify(createSession.mock.calls[0]?.[0].participants)).not.toContain("transport-");
  });

  it("uses logical match result keys for ranked and legacy tournament records", async () => {
    const rankedRoom = await makeRoom();
    const rankedInternal = internals(rankedRoom);
    rankedRoom.state.matchId = "logical-ranked-match";
    for (const seat of [0, 1] as const) {
      const player = new PlayerState();
      player.seat = seat;
      player.sessionId = `ranked-client-${seat}`;
      rankedRoom.state.players[seat] = player;
      rankedInternal.accountByClient.set(player.sessionId, `account-${seat}`);
      rankedInternal.rankedByClient.set(player.sessionId, true);
    }
    await rankedInternal.recordAuthoritativeResult({
      kind: "gameOver",
      result: { outcome: "draw" },
      reason: "effect",
    });
    expect(rankedRoom.recordMatch).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        resultKey: resultEffectIdempotencyKey("logical-ranked-match", "logical-ranked-match", "ranked-record"),
      }),
    );

    const tournamentRoom = await makeRoom({ tournamentRoom: true });
    const tournamentInternal = internals(tournamentRoom);
    tournamentRoom.state.matchId = "logical-tournament-match";
    tournamentInternal.tournamentMatchId = "tournament-match";
    for (const seat of [0, 1] as const) {
      const player = new PlayerState();
      player.seat = seat;
      player.sessionId = `tournament-client-${seat}`;
      tournamentRoom.state.players[seat] = player;
      tournamentInternal.accountByClient.set(player.sessionId, `account-${seat}`);
    }
    await tournamentInternal.recordAuthoritativeResult({
      kind: "gameOver",
      result: { outcome: "draw" },
      reason: "effect",
    });
    expect(tournamentRoom.recordTournamentRoomDraw).toHaveBeenCalledExactlyOnceWith(
      "tournament-match",
      "source-room",
      ["account-0", "account-1"],
      "effect",
      undefined,
      resultEffectIdempotencyKey("logical-tournament-match", "logical-tournament-match", "tournament-result"),
    );
  });

  it("restores a compatible stopped-Main checkpoint into an inert prepared room", async () => {
    const state = mainBoundary("logical-room");
    const snapshot = exportStoppedMainBoundary(state);
    const session: RoomSessionRecord = {
      sessionId: "logical-room",
      mode: "casual",
      status: "active",
      participants: [
        { seat: 0, kind: "account", principalId: "account-a" },
        { seat: 1, kind: "account", principalId: "account-b" },
      ],
      tournamentMatchId: null,
      tournamentGameId: null,
      owner: { generationId: "source", processId: "server-1", roomId: "source-room" },
      ownerEpoch: 1,
      checkpointVersion: 1,
      nextCommandSequence: 1,
      lastCompletedCommandSequence: 0,
      activeTransferId: "transfer-1",
      createdAt: 1,
      updatedAt: 2,
      completedAt: null,
      retentionUntil: null,
    };
    const checkpoint = checkpointRecord("logical-room", snapshot);
    const transfer = transferRecord("logical-room", "destination-room", checkpoint.checkpointId);
    const room = await makeRoom({ handoffPrepared: true }, fakeStore(session, checkpoint, transfer, session));
    (room as unknown as { roomId: string }).roomId = "destination-room";

    const prepared = await room.prepareFromHandoffCheckpoint({
      sessionId: "logical-room",
      transferId: "transfer-1",
      ownerEpoch: 2,
      executionVersion: "engine-v1",
      rulesVersion: "rules-v1",
      sourceRevision: "source-v1",
    });

    expect(prepared).toBe(true);
    expect(room.state.matchId).toBe("logical-room");
    expect(internals(room).engine.permanentSeq).toBe(31);
    expect(internals(room).engine.instanceSeq).toBe(9);
    expect(internals(room).handoffAuthority.mode).toBe("prepared");
    expect(await room.onAuth(client("blocked"), { displayName: "A", deck: EMPTY_DECK })).toBe(false);

    session.owner = transfer.to;
    session.ownerEpoch = transfer.toOwnerEpoch;
    transfer.status = "destination_active";
    expect(await room.activatePreparedHandoff(2)).toBe(true);
    expect(internals(room).handoffAuthority.mode).toBe("active");
    session.activeTransferId = null;
    transfer.status = "completed";
    expect(await internals(room).hasCurrentDurableAuthority(2)).toBe(true);
  });

  it("exports engine allocator continuity into the checksummed checkpoint envelope", async () => {
    const transfer = transferRecord("logical-room", "destination-room", "checkpoint-1");
    transfer.status = "frozen";
    const session: RoomSessionRecord = {
      sessionId: "logical-room",
      mode: "casual",
      status: "active",
      participants: [
        { seat: 0, kind: "account", principalId: "account-a" },
        { seat: 1, kind: "account", principalId: "account-b" },
      ],
      tournamentMatchId: null,
      tournamentGameId: null,
      owner: transfer.from,
      ownerEpoch: 1,
      checkpointVersion: 0,
      nextCommandSequence: 1,
      lastCompletedCommandSequence: 0,
      activeTransferId: transfer.transferId,
      createdAt: 1,
      updatedAt: 1,
      completedAt: null,
      retentionUntil: null,
    };
    const store = fakeStore({}, undefined, transfer, session);
    const room = await makeRoom({}, store);
    internals(room).handoffSessionId = "logical-room";
    room.state.matchId = "logical-room";
    room.state.phase = Phase.Main;
    for (const seat of [0, 1] as const) {
      const player = new PlayerState();
      player.seat = seat;
      player.sessionId = `session-${seat}`;
      player.displayName = `Player ${seat}`;
      room.state.players[seat] = player;
    }
    expect(room.freezeForHandoff(1, transfer.transferId)).toBe(true);
    expect(
      await room.saveStoppedMainCheckpoint({
        executionVersion: "engine-v1",
        rulesVersion: "rules-v1",
        sourceRevision: "source-v1",
        commandSequence: 0,
      }),
    ).toBe(true);

    const save = (store.saveCheckpoint as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(save.snapshot.runtime.engine).toEqual(internals(room).engine.exportContinuityState());
    expect(save.checksum).not.toBe(save.snapshot.payloadSha256);
  });

  it("replays an admitted command once from a confirmed checkpoint on the destination owner", async () => {
    const transferId = "transfer-recovery";
    const session: RoomSessionRecord = {
      sessionId: "logical-room",
      mode: "casual",
      status: "active",
      participants: [
        { seat: 0, kind: "account", principalId: "account-a" },
        { seat: 1, kind: "account", principalId: "account-b" },
      ],
      tournamentMatchId: null,
      tournamentGameId: null,
      owner: { generationId: "destination", processId: "server-2", roomId: "source-room" },
      ownerEpoch: 2,
      checkpointVersion: 1,
      nextCommandSequence: 2,
      lastCompletedCommandSequence: 0,
      activeTransferId: transferId,
      createdAt: 1,
      updatedAt: 2,
      completedAt: null,
      retentionUntil: null,
    };
    const command: RoomCommandRecord = {
      sessionId: session.sessionId,
      commandId: "command-after-crash",
      participantId: "account-a",
      seat: 0,
      participantSequence: 1,
      commandSequence: 1,
      ownerEpoch: 1,
      expectedRevision: null,
      payload: { intent: { type: "hatchEgg" } },
      status: "admitted",
      result: null,
      admittedAt: 2,
      completedAt: null,
    };
    let pending: RoomCommandRecord | undefined = command;
    const store = fakeStore({}, undefined, undefined, session);
    (store.getNextAdmittedCommand as unknown as ReturnType<typeof vi.fn>).mockImplementation(async () => pending);
    (store.completeCommand as unknown as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      pending = undefined;
      return {
        ok: true,
        replayed: false,
        value: { ...command, status: "applied", result: { ok: true }, completedAt: 3 },
      };
    });
    const room = await makeRoom({}, store);
    const state = room.state;
    state.matchId = session.sessionId;
    state.phase = Phase.Main;
    for (const seat of [0, 1] as const) {
      const player = new PlayerState();
      player.seat = seat;
      player.sessionId = `player-${seat}`;
      state.players[seat] = player;
    }
    const roomInternals = room as unknown as {
      handoffSessionId: string;
      handoffTransferId: string;
      handoffAuthority: RoomHandoffLifecycle;
      recoverAdmittedCommand: (ownerEpoch: number) => Promise<boolean>;
      applyLoggedIntent: (seat: 0 | 1, intent: { type: "hatchEgg" }) => { ok: true };
    };
    roomInternals.handoffSessionId = session.sessionId;
    roomInternals.handoffTransferId = transferId;
    roomInternals.handoffAuthority = new RoomHandoffLifecycle({ enabled: true, ownerEpoch: 2, mode: "prepared" });
    const applyEffect = vi.fn(() => ({ ok: true as const }));
    roomInternals.applyLoggedIntent = applyEffect;

    expect(await roomInternals.recoverAdmittedCommand(2)).toBe(true);
    expect(await roomInternals.recoverAdmittedCommand(2)).toBe(true);
    expect(applyEffect).toHaveBeenCalledOnce();
    expect(store.completeCommand).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        ownerEpoch: 2,
        commandId: command.commandId,
        status: "applied",
        checkpoint: expect.any(Object),
      }),
    );
  });

  it("rebinds a program tournament game and compensates its deadline from the matching receipt", async () => {
    const state = mainBoundary("logical-room");
    const snapshot = exportStoppedMainBoundary(state);
    const transfer = transferRecord("logical-room", "destination-room", "checkpoint-1");
    transfer.status = "destination_active";
    const session: RoomSessionRecord = {
      sessionId: "logical-room",
      mode: "tournament",
      status: "active",
      participants: [
        { seat: 0, kind: "account", principalId: "account-a" },
        { seat: 1, kind: "account", principalId: "account-b" },
      ],
      tournamentMatchId: "tournament-match-1",
      tournamentGameId: "game-1",
      owner: transfer.to,
      ownerEpoch: 2,
      checkpointVersion: 1,
      nextCommandSequence: 1,
      lastCompletedCommandSequence: 0,
      activeTransferId: transfer.transferId,
      createdAt: 1,
      updatedAt: 2,
      completedAt: null,
      retentionUntil: null,
    };
    const checkpoint = checkpointRecord("logical-room", snapshot);
    const room = await makeRoom(
      { handoffPrepared: true, tournamentRoom: true },
      fakeStore({}, checkpoint, transfer, session),
    );
    (room as unknown as { roomId: string }).roomId = "destination-room";

    expect(
      await room.prepareFromHandoffCheckpoint({
        sessionId: "logical-room",
        transferId: "transfer-1",
        ownerEpoch: 2,
        executionVersion: "engine-v1",
        rulesVersion: "rules-v1",
        sourceRevision: "source-v1",
      }),
    ).toBe(true);
    expect(
      await room.activatePreparedHandoff(
        2,
        createMigrationPauseReceipt({ transferId: "transfer-1", pausedAtMs: 1, resumedAtMs: 5_001 }),
      ),
    ).toBe(true);
    expect(room.rebindGameRoom).toHaveBeenCalledExactlyOnceWith({
      gameId: "game-1",
      sessionId: "logical-room",
      transferId: "transfer-1",
      fromRoomId: "source-room",
      toRoomId: "destination-room",
      ownerEpoch: 2,
    });
    expect(room.compensateDeadline).toHaveBeenCalledExactlyOnceWith({
      seriesId: "series-1",
      transferId: "transfer-1",
      pausedAtMs: 1,
      resumedAtMs: 5_001,
    });
    expect(await room.activatePreparedHandoff(2)).toBe(true);
    expect(room.compensateDeadline).toHaveBeenCalledOnce();
  });

  it("rejects new intents and suppresses already-armed timers after the room freezes", async () => {
    vi.useFakeTimers();
    const room = await makeRoom();
    const internalsOfRoom = internals(room);
    const player = client("player-a");
    internalsOfRoom.seatByClient.set(player.sessionId, 0);
    internalsOfRoom.handoffSessionId = "logical-room";
    const authority = new RoomHandoffLifecycle({ enabled: true });
    internalsOfRoom.handoffAuthority = authority;

    const timerEffect = vi.fn<() => void>();
    const armTimer = internalsOfRoom.setHandoffAwareTimeout.bind(room);
    armTimer(timerEffect, 1);
    expect(room.freezeForHandoff()).toBe(true);
    internalsOfRoom.handleIntent(player, { type: "ready" });
    await vi.advanceTimersByTimeAsync(2);
    room.clock.tick();

    expect(timerEffect).not.toHaveBeenCalled();
    expect(player.send).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ kind: "actionRejected", reason: "room_handoff_frozen" }),
    );
    expect(room.state.players[0]).toBeUndefined();
  });

  it("unfreezes the source only after the store confirms a pre-claim abort", async () => {
    const room = await makeRoom(
      {},
      fakeStore({
        mode: "casual",
        tournamentMatchId: null,
        owner: { generationId: "source", processId: "server-1", roomId: "source-room" },
        ownerEpoch: 1,
        activeTransferId: null,
      }),
    );
    const roomInternals = internals(room);
    roomInternals.handoffSessionId = "logical-room";
    roomInternals.matchStartRequested = true;
    roomInternals.handoffAuthority = new RoomHandoffLifecycle({ enabled: true });

    expect(room.freezeForHandoff()).toBe(true);
    expect(await room.unfreezeAfterAbortedHandoff()).toBe(true);
    expect(roomInternals.handoffAuthority.mode).toBe("active");
  });

  it("disposes a switched owner without treating it as a leave or unlinking room resources", async () => {
    const releases: string[] = [];
    const claims = new Map<string, string>();
    const directory: RoomCodeDirectory = {
      claim: (code, roomId) => claims.set(code, roomId),
      resolve: async (code) => claims.get(code),
      release: (code) => releases.push(code),
    };
    setRoomCodeDirectory(directory);
    const room = await makeRoom({ private: true, tournamentRoom: true });
    const roomInternals = internals(room);
    const privateCode = room.state.roomCode;
    roomInternals.tournamentMatchId = "legacy-match";
    roomInternals.handoffSessionId = "logical-room";
    roomInternals.handoffAuthority = new RoomHandoffLifecycle({ enabled: true });
    expect(room.freezeForHandoff()).toBe(true);
    const handleDisconnect = vi.spyOn(roomInternals.engine, "handleDisconnect");
    room.disconnect = vi.fn<() => Promise<void>>(async () => room.onDispose()) as AegisRoom["disconnect"];

    const disposed = await room.disposeAfterHandoff(2);
    await room.onLeave(client("departed"), true);

    expect(disposed).toBe(true);
    expect(handleDisconnect).not.toHaveBeenCalled();
    expect(room.releaseTournamentRoom).not.toHaveBeenCalled();
    expect(releases).not.toContain(privateCode);
    expect(await directory.resolve(privateCode)).toBe("source-room");
  });
});

function makeRoom(
  options: { handoffPrepared?: boolean; private?: boolean; tournamentRoom?: boolean } = {},
  store?: RoomHandoffStore,
) {
  return createTestRoom(
    options,
    store ??
      fakeStore({
        owner: { generationId: "next", processId: "server-2", roomId: "destination-room" },
        ownerEpoch: 2,
      }),
  );
}

async function createTestRoom(
  options: { handoffPrepared?: boolean; private?: boolean; tournamentRoom?: boolean },
  store: RoomHandoffStore,
): Promise<HandoffTestRoom> {
  const room = new HandoffTestRoom(store);
  (room as unknown as { roomId: string }).roomId = "source-room";
  room.broadcast = vi.fn<() => boolean>(() => true) as AegisRoom["broadcast"];
  await room.onCreate({
    ...options,
    ...(options.handoffPrepared ? { handoffReservationToken: "valid-test-reservation" } : {}),
    seed: 1,
  });
  return room;
}

function internals(room: AegisRoom): {
  seatByClient: Map<string, 0 | 1>;
  accountByClient: Map<string, string>;
  rankedByClient: Map<string, boolean>;
  recordAuthoritativeResult: (event: Extract<ServerEvent, { kind: "gameOver" }>) => Promise<void>;
  handoffSessionId: string | undefined;
  handoffAuthority: RoomHandoffLifecycle;
  setHandoffAwareTimeout: (callback: () => void, delayMs: number) => unknown;
  ensureLogicalSession: () => Promise<void>;
  hasCurrentDurableAuthority: (ownerEpoch: number) => Promise<boolean>;
  handleIntent: (client: Client, intent: { type: "ready" }) => void;
  matchStartRequested: boolean;
  engine: GameEngine;
  tournamentMatchId: string | undefined;
} {
  return room as unknown as ReturnType<typeof internals>;
}

function fakeStore(
  overrides: Partial<RoomSessionRecord> = {},
  checkpoint?: RoomCheckpointRecord,
  transfer?: RoomTransferRecord,
  liveSession?: RoomSessionRecord,
): RoomHandoffStore {
  const session: RoomSessionRecord = liveSession ?? {
    sessionId: "logical-room",
    mode: "tournament",
    status: "active",
    participants: [
      { seat: 0, kind: "account", principalId: "account-0" },
      { seat: 1, kind: "account", principalId: "account-1" },
    ],
    tournamentMatchId: "legacy-match",
    tournamentGameId: null,
    owner: { generationId: "source", processId: "server-1", roomId: "source-room" },
    ownerEpoch: 1,
    checkpointVersion: 0,
    nextCommandSequence: 1,
    lastCompletedCommandSequence: 0,
    activeTransferId: null,
    createdAt: 1,
    updatedAt: 1,
    completedAt: null,
    retentionUntil: null,
    ...overrides,
  };
  return {
    createSession: vi.fn<
      (input: {
        sessionId: string;
        mode: string;
        participants: RoomSessionRecord["participants"];
        owner: RoomSessionRecord["owner"];
      }) => Promise<unknown>
    >(
      async (input: {
        sessionId: string;
        mode: string;
        participants: RoomSessionRecord["participants"];
        owner: RoomSessionRecord["owner"];
      }) => ({
        ok: true,
        replayed: false,
        value: {
          ...session,
          sessionId: input.sessionId,
          mode: input.mode,
          participants: input.participants,
          owner: input.owner,
        },
      }),
    ),
    getSession: vi.fn<(sessionId: string) => Promise<RoomSessionRecord | undefined>>(async () => session),
    getCheckpoint: vi.fn<(sessionId: string) => Promise<RoomCheckpointRecord | undefined>>(async () => checkpoint),
    getTransfer: vi.fn<(transferId: string) => Promise<RoomTransferRecord | undefined>>(async () => transfer),
    getNextAdmittedCommand: vi.fn<(sessionId: string) => Promise<RoomCommandRecord | undefined>>(async () => undefined),
    getCommand: vi.fn<(sessionId: string, commandId: string) => Promise<RoomCommandRecord | undefined>>(
      async () => undefined,
    ),
    saveCheckpoint: vi.fn(async () => ({ ok: true, value: undefined })),
    completeCommand: vi.fn(async () => ({ ok: false as const, reason: "command_not_found" as const })),
    redeemRoomHandoffReservation: vi.fn(async (input: { ownerEpoch: number; roomId: string; processId: string }) => ({
      transferId: transfer?.transferId ?? "transfer-1",
      sessionId: session.sessionId,
      sourceOwnerEpoch: input.ownerEpoch - 1,
      destinationGenerationId: "legacy",
      ownerEpoch: input.ownerEpoch,
      expiresAt: Date.now() + 60_000,
      consumedAt: Date.now(),
      roomId: input.roomId,
      processId: input.processId,
    })),
  } as unknown as RoomHandoffStore;
}

function mainBoundary(matchId: string): GameState {
  const state = new GameState();
  state.matchId = matchId;
  state.phase = Phase.Main;
  for (const seat of [0, 1] as const) {
    const player = new PlayerState();
    player.seat = seat;
    player.sessionId = `session-${seat}`;
    player.displayName = `Player ${seat}`;
    state.players[seat] = player;
  }
  return state;
}

function checkpointRecord(
  sessionId: string,
  snapshot: ReturnType<typeof exportStoppedMainBoundary>,
): RoomCheckpointRecord {
  const checkpointSnapshot = {
    ...snapshot,
    runtime: {
      protocol: "aegis-room-runtime-continuity",
      version: 1,
      transferId: "transfer-1",
      pausedAtMs: 1,
      engine: {
        protocol: "aegis-game-engine-continuity",
        version: 1,
        permanentSeq: 31,
        instanceSeq: 9,
        windowTokenSeq: 17,
        random: null,
      },
      botRoster: null,
    },
  };
  return {
    sessionId,
    checkpointId: "checkpoint-1",
    checkpointVersion: 1,
    snapshotSchemaVersion: snapshot.snapshotVersion,
    executionVersion: "engine-v1",
    rulesVersion: "rules-v1",
    sourceRevision: "source-v1",
    commandSequence: 0,
    checksum: digestJson(checkpointSnapshot),
    snapshot: checkpointSnapshot as unknown as RoomCheckpointRecord["snapshot"],
    createdAt: 2,
  };
}

function digestJson(value: unknown): string {
  const canonical = (entry: unknown): string => {
    if (Array.isArray(entry)) return `[${entry.map(canonical).join(",")}]`;
    if (typeof entry === "object" && entry !== null) {
      const record = entry as Record<string, unknown>;
      return `{${Object.keys(record)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`)
        .join(",")}}`;
    }
    return JSON.stringify(entry) ?? "null";
  };
  return createHash("sha256").update(canonical(value)).digest("hex");
}

function transferRecord(sessionId: string, targetRoomId: string, checkpointId: string): RoomTransferRecord {
  return {
    transferId: "transfer-1",
    sessionId,
    from: { generationId: "source", processId: "server-1", roomId: "source-room" },
    to: { generationId: "next", processId: "server-2", roomId: targetRoomId },
    fromOwnerEpoch: 1,
    toOwnerEpoch: 2,
    status: "snapshot_saved",
    checkpointId,
    failureCode: null,
    startedAt: 1,
    updatedAt: 2,
    committedAt: null,
    completedAt: null,
  };
}

function setRoomCodeDirectory(directory: RoomCodeDirectory): void {
  roomCodeDirectorySetter(directory);
}
