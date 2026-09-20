import { log, logError, withMatchLog } from "../logger.js";
import { Room, Client, ServerError, matchMaker, type Delayed } from "colyseus";
import { canCreateRoom } from "../deployment/admission.js";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  GameState,
  Phase,
  RECONNECT_GRACE_SECONDS,
  combatWindowKey,
  type CombatWindow,
  type Intent,
  type DecisionRequest,
  type Seat,
  type ServerEvent,
  type SequencedServerEvent,
  EVENT_CHANNEL,
  DECISION_CHANNEL,
  PRESENTATION_CHANNEL,
} from "@aegis/shared";
import { isDevScenarioId, type DevScenarioId } from "../engine/devScenario.js";
import { GameEngine, type GameEngineContinuityFrame, type SeatJoinOptions } from "../engine/GameEngine.js";
import type { VisibilityPort } from "../engine/state/index.js";
import { BotPlayer, type BotOptions } from "../bot/BotPlayer.js";
import { playableBotDeck } from "../engine/botDeck.js";
import { accountStore } from "../accounts/runtime.js";
import type { AccountStore, DeckSnapshot } from "../accounts/AccountStore.js";
import {
  RoomHandoffStore,
  type JsonValue,
  type RoomCommandRecord,
  type RoomOwner,
  type RoomParticipant,
  type RoomSessionRecord,
} from "../db/roomHandoff/RoomHandoffStore.js";
import { seriesStore } from "../tournaments/runtime.js";
import type { SeriesStore } from "../tournaments/series/index.js";
import { createLocalRoomCodeDirectory, type RoomCodeDirectory } from "../cluster/roomCodes.js";
import { parsePresentationReport } from "./presentationReport.js";
import { loadPreparedMainCheckpoint, RoomHandoffLifecycle, roomHandoffServerEnabled } from "./RoomHandoffLifecycle.js";
import {
  restoreMigrationPauseReceipt,
  resultEffectIdempotencyKey,
  type DormantBotRosterFrame,
  type MigrationPauseReceipt,
} from "./handoff/stage5Primitives.js";
import { ROOM_HANDOFF_SNAPSHOT_VERSION, exportStoppedMainBoundary } from "./handoff/experiment.js";

/** Hand-laid boards must never be reachable by a real player. */
const DEV_SCENARIOS_ENABLED = process.env.NODE_ENV !== "production";
const WAITING_ROOM_TIMEOUT_SECONDS = positiveSeconds(process.env.AEGIS_WAITING_ROOM_TIMEOUT_SECONDS, 30 * 60);
const ROOM_RUNTIME_PROTOCOL = "aegis-room-runtime-continuity" as const;
const COMMAND_CHANNEL = "command";
const COMMAND_RECEIPT_CHANNEL = "commandReceipt";
const COMMAND_CHECKPOINT_TRANSFER_ID = "__room-command-checkpoint__";
const DURABLE_COMMAND_TYPES = new Set<Intent["type"]>([
  "ready",
  "mulligan",
  "playCard",
  "appFusion",
  "digivolve",
  "hatchEgg",
  "moveFromBreeding",
  "activateEffect",
  "linkCard",
  "dnaDigivolve",
  "endPhase",
  "attack",
  "declareBlock",
  "declineBlock",
  "respondCounter",
  "respondAlliance",
  "respondEvade",
  "respondBarrier",
  "respondDecision",
  "surrender",
]);

type DurableCommandEnvelope = {
  gameId: string;
  ownerEpoch: number;
  commandId: string;
  sequence: number;
  kind: Intent["type"];
  payload: Record<string, unknown>;
};
const DEFAULT_ROOM_RESUME_CREDENTIAL_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface RoomRuntimeContinuityFrame {
  readonly protocol: typeof ROOM_RUNTIME_PROTOCOL;
  readonly version: 1;
  readonly transferId: string;
  readonly pausedAtMs: number;
  readonly engine: GameEngineContinuityFrame;
  readonly botRoster: DormantBotRosterFrame | null;
}

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

function generateRoomCode(length = 6): string {
  const bytes = randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_CHARS[bytes[i]! % CODE_CHARS.length]!;
  }
  return code;
}

function positiveSeconds(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function roomResumeCredentialLifetimeMs(): number {
  const configured = Number(process.env.AEGIS_ROOM_RESUME_CREDENTIAL_TTL_MS);
  if (!Number.isSafeInteger(configured) || configured < 60_000 || configured > 30 * 24 * 60 * 60 * 1000)
    return DEFAULT_ROOM_RESUME_CREDENTIAL_TTL_MS;
  return configured;
}

function roomResumeCredentialsEnabled(): boolean {
  const descriptorSecret = process.env.AEGIS_ROOM_HANDOFF_DESCRIPTOR_SECRET;
  return (
    roomHandoffServerEnabled() && typeof descriptorSecret === "string" && Buffer.byteLength(descriptorSecret) >= 32
  );
}

function restoreRoomRuntimeFrame(value: unknown, transferId: string): RoomRuntimeContinuityFrame | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const frame = value as Partial<RoomRuntimeContinuityFrame>;
  if (
    frame.protocol !== ROOM_RUNTIME_PROTOCOL ||
    frame.version !== 1 ||
    (frame.transferId !== transferId && frame.transferId !== COMMAND_CHECKPOINT_TRANSFER_ID) ||
    !Number.isSafeInteger(frame.pausedAtMs) ||
    frame.pausedAtMs! < 0 ||
    typeof frame.engine !== "object" ||
    frame.engine === null ||
    frame.botRoster !== null
  )
    return undefined;
  return frame as RoomRuntimeContinuityFrame;
}

function checkpointDigest(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function parseDurableCommand(value: unknown): DurableCommandEnvelope | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const envelope = value as Record<string, unknown>;
  if (
    typeof envelope.gameId !== "string" ||
    !Number.isSafeInteger(envelope.ownerEpoch) ||
    typeof envelope.commandId !== "string" ||
    envelope.commandId.length < 1 ||
    envelope.commandId.length > 200 ||
    !Number.isSafeInteger(envelope.sequence) ||
    (envelope.sequence as number) < 1 ||
    typeof envelope.kind !== "string" ||
    !DURABLE_COMMAND_TYPES.has(envelope.kind as Intent["type"]) ||
    typeof envelope.payload !== "object" ||
    envelope.payload === null ||
    Array.isArray(envelope.payload)
  )
    return undefined;
  try {
    JSON.stringify(envelope.payload);
  } catch {
    return undefined;
  }
  return envelope as unknown as DurableCommandEnvelope;
}

/**
 * Rebuild the opening event of a mirrored combat window, so a client that was offline when the
 * original broadcast went out (Colyseus never redelivers a channel message to a socket that was
 * down) receives it on reconnect — the combat counterpart of the resent `pendingDecision`.
 */
function combatWindowEvent(window: CombatWindow): ServerEvent | undefined {
  switch (window.kind) {
    case "block":
      return {
        kind: "blockWindowOpened",
        attackerPermanentId: window.attackerPermanentId,
        eligibleBlockerIds: [...window.eligiblePermanentIds],
        ...(window.mustBlock ? { mustBlock: true } : {}),
      };
    case "counter":
      return {
        kind: "counterWindowOpened",
        attackerPermanentId: window.attackerPermanentId,
        defendingSeat: window.seat,
        eligibleCounters: JSON.parse(window.eligibleCountersJson || "[]") as {
          instanceId: string;
          effectKey: string;
          description: string;
        }[],
      };
    case "alliance":
      return {
        kind: "alliancePrompt",
        permanentId: window.permanentId,
        eligibleAllyIds: [...window.eligiblePermanentIds],
      };
    case "evade":
      return { kind: "evadePrompt", permanentId: window.permanentId };
    case "barrier":
      return { kind: "barrierPrompt", permanentId: window.permanentId };
    default:
      return undefined;
  }
}

/**
 * Join payload a client supplies via client.joinOrCreate(ROOM_TYPE, options). Extends the
 * engine-owned {@link SeatJoinOptions} (displayName + deck) with the transport-only private
 * room code, which the engine's seatPlayer has no use for.
 *
 * A tournament room is entered by one of two flows, told apart by which options are present:
 *
 *  - PROGRAM flow — `tournamentGameId` + `tournamentGameToken`. The token is a Tournament Game
 *    authorization issued by the series module to one participant. It carries the identity, so
 *    this flow needs no `authTicket` and never touches `room_tickets` or the legacy bracket.
 *  - LEGACY flow — `authTicket` + `tournamentMatchId`, the pre-program single-elimination path
 *    where `POST /tournaments/:id/matches/:matchId/ticket` mints a room ticket that names a match.
 *
 * The program options win when both are supplied. The legacy flow is untouched so existing
 * brackets keep running until the manager takes them over.
 */
export interface AegisJoinOptions extends SeatJoinOptions {
  deckId?: string;
  deckName?: string;
  roomCode?: string; // for joining a private room by code
  ranked?: boolean;
  authTicket?: string;
  tournamentMatchId?: string;
  tournamentGameId?: string;
  tournamentGameToken?: string;
}

/**
 * Who a validated join belongs to, and the exclusive claim to take once every other check passes.
 * `commit` returning false is a rejection like any other.
 */
type JoinIdentity = { account: { id: string; displayName: string } | undefined; commit: () => Promise<boolean> };

/**
 * Registry of all live AegisRoom instances, keyed by roomId. Used by the HTTP
 * bot endpoint to look up rooms without going through the Colyseus matchmaker.
 */
export const roomRegistry = new Map<string, AegisRoom>();

/**
 * Where private room codes are resolved to Colyseus room ids.
 *
 * Injected rather than fixed, because the answer depends on the deployment: one process resolves
 * from its own memory, while a cluster has to resolve a code claimed by a sibling. Defaults to
 * the local directory so nothing has to configure anything to run a single process.
 */
let roomCodes: RoomCodeDirectory = createLocalRoomCodeDirectory();
let persistentRoomHandoffStore: RoomHandoffStore | undefined;

function defaultRoomHandoffStore(): RoomHandoffStore {
  persistentRoomHandoffStore ??= new RoomHandoffStore(accountStore.pool);
  return persistentRoomHandoffStore;
}

/** Point every room at a shared code directory (called once, at boot). */
export function setRoomCodeDirectory(directory: RoomCodeDirectory): void {
  roomCodes = directory;
}

/** The directory in force, for callers that resolve codes outside a room. */
export function roomCodeDirectory(): RoomCodeDirectory {
  return roomCodes;
}

/**
 * A batch being filled. `recipient` is set for a batch that belongs to one client only
 * (a rejection), which is never broadcast and never bumps the shared state revision.
 */
interface OpenBatch {
  id: string;
  emitted: number;
  lastSeq: number;
  recipient?: Client;
}

/**
 * The one and only room class (REQUIRED name "AegisRoom"), registered as room
 * type "aegis" in src/index.ts. It is a thin transport adapter: it seats players,
 * forwards intents to the GameEngine, relays decision requests, and broadcasts the
 * event log. All rules live in the engine (API-CONTRACT.md section 1).
 */
export class AegisRoom extends Room<GameState> {
  override maxClients = 2;
  private engine!: GameEngine;
  private seatByClient = new Map<string, Seat>(); // sessionId -> seat
  private presentationLogWindows = new Map<Seat, { start: number; count: number }>();
  private accountByClient = new Map<string, string>();
  private rankedByClient = new Map<string, boolean>();
  private deckByClient = new Map<string, DeckSnapshot>();
  /**
   * Bot drivers by seat. An array rather than one field because a tournament confrontation between
   * two bots has to run with nobody connected at all, so both seats can be driven at once.
   */
  private bots: (BotPlayer | undefined)[] = [undefined, undefined];
  /**
   * Which participant each tournament seat belongs to, recorded when the seat's authorization is
   * redeemed. A bot seat has no client and therefore no `accountByClient` entry, so this is the
   * only way the room can say who won.
   */
  private tournamentSeatHolders: ({ accountId: string } | { participantId: string } | undefined)[] = [
    undefined,
    undefined,
  ];
  private isBotRoom = false;
  private devScenario: DevScenarioId | undefined;
  private readonly BOT_SEAT = 1 as Seat;
  private isPrivate = false;
  private isRankedRoom = false;
  private isBetaBattleRoom = false;
  private isTournamentRoom = false;
  private tournamentMatchId: string | undefined;
  private tournamentGameId: string | undefined;
  private readyTimeout: Delayed | undefined;
  private waitingRoomTimeout: Delayed | undefined;
  private matchStartRequested = false;
  private handoffAuthority = new RoomHandoffLifecycle({ enabled: false });
  private handoffStoreInstance: RoomHandoffStore | undefined;
  private handoffSessionId: string | undefined;
  private handoffTransferId: string | undefined;
  private handoffSessionCreation: Promise<void> | undefined;
  private handoffSessionAttempted = false;
  private handoffSessionUnsupported = false;
  private handoffSessionFailure: unknown;
  private handoffParticipants: RoomParticipant[] | undefined;
  private issuedResumeCredentials = new Map<string, { credential: string; expiresAt: number }>();
  private handoffRestored = false;
  private handoffPausedAtMs: number | undefined;
  private handoffRuntimeFrame: RoomRuntimeContinuityFrame | undefined;
  private commandQueue: Promise<void> = Promise.resolve();
  private commandQuarantined = false;
  private unsequencedHandoffIntentCount = 0;
  private prevalidatedJoinSessions = new Set<string>();
  private migrationDisposal = false;
  private engineSeed = 1;

  /** Position of the last event put on the wire; the first event of a room is `seq` 1. */
  private eventSeq = 0;
  /** Serial the batch ids are minted from. */
  private batchSeq = 0;
  /** The batch events are currently being stamped into, if any. */
  private currentBatch: OpenBatch | undefined;
  /** How many nested engine entries are inside the open batch; only the outermost closes it. */
  private batchDepth = 0;
  /** Full channel request retained while its mirrored decision can be resumed. */
  private pendingDecisionRequest: DecisionRequest | undefined;
  /**
   * The `securityRevealed` of a check that has not closed yet, kept so a client that reconnects
   * mid-check is handed the reveal it missed. Unlike the pending decision and the combat window,
   * an open check has no mirror in synchronized state, so there is nothing a resumed client could
   * read it back from: it would resync to the current board and play the clash it never saw
   * opened, on a board that stood still for the seconds the check was asking its questions.
   */
  private openSecurityReveal: ServerEvent | undefined;

  /** Seam: the tournament series module this room reports to. Tests substitute their own. */
  protected series(): SeriesStore {
    return seriesStore;
  }

  /** Seam: the account store this room reads identity and legacy bracket state from. */
  protected accounts(): AccountStore {
    return accountStore;
  }

  /** Seam: the persistence port is constructed only when the server-side experiment is enabled. */
  protected roomHandoffStore(): RoomHandoffStore | undefined {
    return roomHandoffServerEnabled() ? defaultRoomHandoffStore() : undefined;
  }

  // How long the in-memory match is held open for a client that dropped without
  // a consented leave (network blip, tab reload, mobile browser backgrounded —
  // phones kill the socket seconds after the app loses focus). A reconnect within
  // this window resumes the same seat; past it the drop resolves as a real
  // departure. Sized so switching apps to answer a message does not forfeit the
  // match. This cannot survive a server restart (deploy) — the room state lives
  // only in memory.
  private readonly RECONNECT_GRACE_SECONDS = RECONNECT_GRACE_SECONDS;

  // How long both seats can sit joined-but-not-ready (e.g. a client stuck loading
  // assets, or one that crashed before it could send `ready`) before the room gives
  // up waiting and starts anyway, so the match never hangs indefinitely.
  private readonly READY_TIMEOUT_SECONDS = 60;

  // How long an open combat prompt (block, Counter, Alliance, Evade, Barrier) waits for its
  // answer before the server closes it at the safe default. The attack is parked on an
  // unresolved promise until then, so an answer that never comes wedges the match for BOTH
  // seats. Sized above RECONNECT_GRACE_SECONDS so a player who drops mid-window still gets the
  // full grace period to come back and answer it themselves; past that the seat is gone anyway.
  private readonly COMBAT_WINDOW_TIMEOUT_SECONDS = 240;

  private combatWindowTimeout: Delayed | undefined;
  private combatWindowTimeoutKey: string | undefined;

  override async onAuth(client: Client, options: AegisJoinOptions): Promise<boolean> {
    const ownerEpoch = this.handoffAuthority.ownerEpoch;
    if (!this.handoffAuthority.acceptsAuthority(ownerEpoch)) return false;
    if (!(await this.hasCurrentDurableAuthority(ownerEpoch))) return false;
    if (this.matchStartRequested && !this.handoffRestored) return false;
    if (this.seatByClient.size >= this.maxClients) return false;
    const identity = await this.resolveIdentity(options);
    if (!identity) return false;
    if (!this.handoffAuthority.acceptsAuthority(ownerEpoch)) return false;
    if (!(await this.hasCurrentDurableAuthority(ownerEpoch))) return false;
    const account = identity.account;
    const restoredParticipant = !!(
      account &&
      this.handoffRestored &&
      this.handoffSessionId &&
      this.handoffParticipants?.some(
        (participant) => participant.kind === "account" && participant.principalId === account.id,
      )
    );
    if (this.matchStartRequested && !restoredParticipant) return false;
    if (
      this.handoffParticipants &&
      (!account ||
        !this.handoffParticipants.some(
          (participant) => participant.kind === "account" && participant.principalId === account.id,
        ))
    )
      return false;
    if (account) options.displayName = account.displayName;
    const normalizedName = options.displayName.trim().toLocaleLowerCase();
    if (!normalizedName) return false;
    const duplicateName = this.state.players.find(
      (player) => player?.displayName.trim().toLocaleLowerCase() === normalizedName,
    );
    const reattachingOwnSeat =
      restoredParticipant &&
      account !== undefined &&
      this.handoffParticipants?.some(
        (participant) =>
          participant.kind === "account" &&
          participant.principalId === account.id &&
          duplicateName?.seat === participant.seat,
      );
    if (duplicateName && !reattachingOwnSeat) return false;
    if ((options.ranked === true) !== this.isRankedRoom || ((this.isRankedRoom || this.isTournamentRoom) && !account))
      return false;
    // A private room allows beta cards without the client asking for them, so only the
    // public room types have to agree with the joiner's beta flag.
    if (!this.isPrivate && (options.betaBattleMode === true) !== this.isBetaBattleRoom) return false;
    if (
      (this.isRankedRoom || this.isTournamentRoom) &&
      account &&
      [...this.accountByClient.values()].includes(account.id)
    )
      return false;
    // The host of a private room is always allowed; anybody after them needs the code.
    if (this.isPrivate && this.clients.length > 0 && options.roomCode !== this.state.roomCode) return false;
    // Every cheap check has passed, so it is finally safe to take the exclusive claims. Claiming
    // before a rejection would pin a bracket match or a Tournament Game to a room nobody ever
    // enters, and neither can be re-bound afterwards: the match would wedge (onDispose only
    // releases what was committed) and the game's UNIQUE room_id would refuse every later room.
    if (!(await identity.commit())) return false;
    if (account) this.accountByClient.set(client.sessionId, account.id);
    return true;
  }

  /**
   * Establishes who is joining, by whichever of the two tournament flows the options describe (see
   * {@link AegisJoinOptions}), or by the plain room ticket for casual and ranked play.
   *
   * The two flows are mutually exclusive in BOTH directions — by the options presented and by what
   * this room is already bound to. Colyseus builds its room-discovery query only from the filter
   * keys a client actually sends, so a legacy join carrying a spurious `tournamentGameId` would
   * otherwise create a room that a later program join for that game discovers and enters, seating a
   * non-participant in a real tournament game.
   *
   * `undefined` means the join is refused. The returned `commit` takes the exclusive claim and
   * records what the room must remember; it runs only once every other check has passed, and its
   * `false` is itself a rejection.
   */
  private async resolveIdentity(options: AegisJoinOptions): Promise<JoinIdentity | undefined> {
    const gameId = options.tournamentGameId;
    const token = options.tournamentGameToken;
    if (gameId && token) {
      // PROGRAM flow. Nothing from the legacy flow may ride along, and this room must not already
      // be a legacy bracket room.
      if (!this.isTournamentRoom || this.tournamentMatchId || options.tournamentMatchId || options.authTicket)
        return undefined;
      if (this.tournamentGameId && this.tournamentGameId !== gameId) return undefined;
      const entry = await this.series().inspectAuthorization({
        gameId,
        authorizationToken: token,
        roomId: this.roomId,
      });
      if (!entry.ok) return undefined;
      const { accountId, displayName, deck } = entry.value;
      // A bot's authorization is never valid over the wire. It has no Account, it is only ever
      // issued server-side to the code that drives the bot seat, and a client presenting one would
      // be redeeming a seat that is not a person's to take.
      if (!accountId) return undefined;
      // The frozen competitive deck is the only deck a tournament game is played with. Whatever the
      // client sent is discarded here, before onJoin can hand it to the engine.
      options.deck = {
        mainDeck: [...deck.mainDeck],
        eggDeck: [...deck.eggDeck],
        mainDeckArts: deck.mainDeckArts?.slice(),
        eggDeckArts: deck.eggDeckArts?.slice(),
      };
      options.deckId = deck.deckId ?? undefined;
      options.deckName = deck.name;
      return {
        account: { id: accountId, displayName },
        commit: async () => {
          // Claiming binds this room to the game exactly once; the opponent's own authorization
          // then finds it already bound to this room and is admitted to it.
          const claimed = await this.series().claimGame({ gameId, authorizationToken: token, roomId: this.roomId });
          if (!claimed.ok) return false;
          this.tournamentGameId = gameId;
          return true;
        },
      };
    }

    // LEGACY flow (and casual/ranked): a single-use room ticket, which for a tournament room must
    // name the match the client asked to join. A program option present here is a mismatched join.
    if (options.tournamentGameId || options.tournamentGameToken || this.tournamentGameId) return undefined;
    const ticket = await this.accounts().consumeRoomTicket(options.authTicket);
    if (this.isTournamentRoom) {
      const matchId = ticket?.tournamentMatchId;
      if (!ticket || !matchId || options.tournamentMatchId !== matchId) return undefined;
      if (this.tournamentMatchId && this.tournamentMatchId !== matchId) return undefined;
      return {
        account: ticket.account,
        commit: async () => {
          if (!(await this.accounts().claimTournamentRoom(matchId, this.roomId))) return false;
          this.tournamentMatchId = matchId;
          return true;
        },
      };
    }
    return {
      account: ticket?.account,
      commit: async () => {
        if (ticket?.tournamentMatchId) this.tournamentMatchId = ticket.tournamentMatchId;
        return true;
      },
    };
  }

  override async onCreate(options: {
    seed?: number;
    private?: boolean;
    botRoom?: boolean;
    rankedRoom?: boolean;
    betaBattleRoom?: boolean;
    tournamentRoom?: boolean;
    /** Internal server-to-server handoff preparation; inert even if an untrusted caller requests it. */
    handoffPrepared?: boolean;
    handoffOwnerEpoch?: number;
    handoffReservationToken?: string;
    devScenario?: unknown;
  }): Promise<void> {
    this.setState(new GameState());
    this.handoffStoreInstance = this.roomHandoffStore();
    let reservation: Awaited<ReturnType<RoomHandoffStore["redeemRoomHandoffReservation"]>> | undefined;
    if (
      options.handoffPrepared === true &&
      this.handoffStoreInstance &&
      typeof options.handoffReservationToken === "string"
    ) {
      const deploymentGenerationId =
        process.env.AEGIS_DEPLOYMENT_GENERATION_ID ?? process.env.AEGIS_DEPLOYMENT_SLOT ?? "legacy";
      reservation = await this.handoffStoreInstance.redeemRoomHandoffReservation({
        tokenHash: createHash("sha256").update(options.handoffReservationToken).digest("hex"),
        destinationGenerationId: deploymentGenerationId,
        ownerEpoch: options.handoffOwnerEpoch ?? 1,
        roomId: this.roomId,
        processId:
          process.env.AEGIS_PROCESS_ID ?? matchMaker.processId ?? `${process.env.HOSTNAME ?? "local"}:${process.pid}`,
        now: Date.now(),
      });
    }
    const preparedHandoff = reservation !== undefined;
    if (options.handoffPrepared === true && !preparedHandoff)
      throw new ServerError(403, "A valid internal room handoff reservation is required.");
    if (!canCreateRoom() && !preparedHandoff)
      throw new ServerError(503, "This game server is draining; retry on the active slot.");
    this.state.matchLogId = randomUUID();
    const seed = options.seed ?? Date.now() >>> 0;
    this.engineSeed = seed;
    if (preparedHandoff && options.private)
      throw new ServerError(400, "Prepared handoff rooms cannot be private rooms.");
    if (reservation) {
      this.handoffSessionId = reservation.sessionId;
      this.handoffTransferId = reservation.transferId;
    }
    this.handoffAuthority = new RoomHandoffLifecycle({
      enabled: this.handoffStoreInstance !== undefined,
      ownerEpoch: reservation?.ownerEpoch ?? 1,
      mode: preparedHandoff ? "prepared" : "active",
    });
    this.debug("room.created", {
      seed,
      private: options.private,
      botRoom: options.botRoom,
      rankedRoom: options.rankedRoom,
      betaBattleRoom: options.betaBattleRoom,
      tournamentRoom: options.tournamentRoom,
      devScenario: options.devScenario,
    });
    this.isBotRoom = options.botRoom === true;
    if (this.isBotRoom) {
      this.maxClients = 1;
      this.autoDispose = true;
      if (DEV_SCENARIOS_ENABLED && isDevScenarioId(options.devScenario)) this.devScenario = options.devScenario;
    }
    this.isRankedRoom = options.rankedRoom === true;
    this.isBetaBattleRoom = options.betaBattleRoom === true;
    this.isTournamentRoom = options.tournamentRoom === true;
    if (options.private) {
      this.isPrivate = true;
      const code = generateRoomCode();
      this.state.roomCode = code;
      roomCodes.claim(code, this.roomId);
      this.autoDispose = true;
    }
    if (!preparedHandoff && !this.isTournamentRoom && this.devScenario === undefined) {
      this.waitingRoomTimeout = this.setHandoffAwareTimeout(() => {
        if (!this.matchStartRequested) void this.disconnect();
      }, WAITING_ROOM_TIMEOUT_SECONDS * 1000);
    }
    this.engine = this.createEngine(seed);

    // One catch-all handler: every client intent type is reassembled into a
    // discriminated-union Intent and handed to the engine, which validates,
    // mutates state, and emits events. Rejections are surfaced to the client.
    this.onMessage("*", (client, type, payload) => {
      if (type === COMMAND_CHANNEL) {
        this.handleDurableCommand(client, payload);
        return;
      }
      if (type === "requestRoomResumeCredential") {
        void this.issueRoomResumeCredential(client, payload);
        return;
      }
      if (type === PRESENTATION_CHANNEL) {
        this.handlePresentationReport(client, payload);
        return;
      }
      this.handleIntent(client, { type, ...(payload as object) } as Intent);
    });

    roomRegistry.set(this.roomId, this);
  }

  private createEngine(seed: number, state: GameState = this.state): GameEngine {
    const engine = new GameEngine(state, {
      seed,
      requestDecision: (seat, req) => this.requestDecision(seat, req),
      onBothReady: () => this.startMatchNow(),
      onActionSettled: (seat, intentType) => {
        this.bots[seat]?.onActionSettled(intentType);
      },
      emit: (event) => {
        if (event.kind === "gameOver") {
          // A completed engine cannot accept replacement players. Locking also
          // guarantees a drawn tournament replay receives a fresh room. A failure here is worth
          // logging and nothing more — the engine is over, so an unlocked room admits nobody who
          // could change the outcome — but it must never surface as an unhandled rejection, which
          // in production kills the process and in tests hides every other failure behind noise.
          void this.lock().catch((error: unknown) =>
            this.debugError("[AegisRoom] failed to lock finished room", error),
          );
          if (!this.migrationDisposal)
            void this.recordAuthoritativeResult(event).catch((error) =>
              this.debugError("[AegisRoom] failed to persist match result", error),
            );
        }
        this.broadcast(EVENT_CHANNEL, this.stamp(event));
        // Rebuild each client's StateView after any event that can move a CardInstance
        // into a public zone (battleArea/breeding topCard) from a private one
        // (hand/eggDeck). @colyseus/schema snapshots node visibility when the view is
        // built, so a card redacted while private stays redacted after it goes public
        // unless the view is rebuilt — otherwise the opponent reads topCard=undefined.
        if (event.kind === "cardPlayed" || event.kind === "cardsMoved" || event.kind === "digivolved") {
          this.rebuildClientViews();
        }
        // After dealing opening hands, force a state patch so clients receive
        // their cards before the mulligan decision arrives. Without this, the
        // decision message (sent synchronously) races ahead of the next scheduled
        // Colyseus patch and the client renders the mulligan overlay with 0 cards.
        if (event.kind === "matchStarted") {
          this.debug("match.initialState", this.state.toJSON());
          // Rebuild each human client's StateView now that the hands are dealt.
          // view.add() records which card ChangeTree nodes are visible at call time;
          // cards pushed after the initial view.add() in onJoin are not automatically
          // visible. Rebuilding here, after runSetup() populates the hands, ensures
          // every dealt card is in the view's visible set before broadcastPatch().
          this.rebuildClientViews();
          this.debug(
            "[AegisRoom] matchStarted — rebuilt views. Hand sizes:",
            this.state.players.map((p, i) => `seat${i}=${p?.hand?.length ?? "?"}`).join(", "),
          );
          this.broadcastPatch();
          this.debug("[AegisRoom] broadcastPatch() returned");
        }
        // A check opens on its reveal and closes on `securityChecked`; everything it asks in
        // between happens while both clients hold on the revealed card.
        if (event.kind === "securityRevealed") this.openSecurityReveal = event;
        else if (event.kind === "securityChecked") this.openSecurityReveal = undefined;
        for (const bot of this.bots) bot?.onEvent(event);
        this.syncCombatWindowTimeout();
      },
    });
    // Route zone arrivals to the per-client StateViews (see exposeCardToClients). Installed
    // before any seat is filled so `seatPlayer` picks it up for both PlayerStates.
    engine.installVisibility(this.exposeCardToClients);
    return engine;
  }

  private ensureLogicalSession(): Promise<void> {
    if (this.handoffSessionFailure) return Promise.reject(this.handoffSessionFailure);
    if (
      !this.handoffStoreInstance ||
      this.handoffAuthority.mode === "disabled" ||
      this.handoffSessionId ||
      this.handoffSessionAttempted ||
      !this.state.players[0] ||
      !this.state.players[1]
    )
      return Promise.resolve();
    if (this.handoffSessionCreation) return this.handoffSessionCreation;

    const participants = this.stableHandoffParticipants();
    if (!participants) {
      this.handoffSessionAttempted = true;
      this.handoffSessionUnsupported = true;
      this.debug("handoff.session.unsupported", { reason: "both stable participants are required" });
      return Promise.resolve();
    }
    this.handoffSessionAttempted = true;
    this.state.matchId = this.state.matchLogId;
    this.handoffParticipants = participants;
    this.handoffSessionCreation = (async () => {
      const owner: RoomOwner = {
        generationId: process.env.AEGIS_DEPLOYMENT_GENERATION_ID ?? process.env.AEGIS_DEPLOYMENT_SLOT ?? "legacy",
        processId:
          process.env.AEGIS_PROCESS_ID ?? matchMaker.processId ?? `${process.env.HOSTNAME ?? "local"}:${process.pid}`,
        roomId: this.roomId,
      };
      let logicalTournamentMatchId = this.tournamentMatchId;
      if (this.tournamentGameId) {
        const series = await this.series().seriesForGame(this.tournamentGameId);
        if (!series) throw new Error(`tournament game has no logical series: ${this.tournamentGameId}`);
        logicalTournamentMatchId = series.matchId;
      }
      const created = await this.handoffStoreInstance!.createSession({
        sessionId: this.state.matchLogId,
        mode: this.roomMode(),
        participants,
        owner,
        tournamentMatchId: logicalTournamentMatchId,
        tournamentGameId: this.tournamentGameId,
        now: Date.now(),
      });
      if (!created.ok) throw new Error(`logical room session rejected: ${created.reason}`);
      this.handoffSessionId = created.value.sessionId;
      this.handoffAuthority = new RoomHandoffLifecycle({ enabled: true, ownerEpoch: created.value.ownerEpoch });
    })()
      .catch((error: unknown) => {
        this.handoffSessionFailure = error;
        throw error;
      })
      .finally(() => {
        this.handoffSessionCreation = undefined;
      });
    return this.handoffSessionCreation;
  }

  private async issueRoomResumeCredential(client: Client, payload: unknown): Promise<void> {
    const store = this.handoffStoreInstance;
    if (
      !store ||
      !roomResumeCredentialsEnabled() ||
      !this.handoffAuthority.acceptsAuthority(this.handoffAuthority.ownerEpoch)
    )
      return;
    if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return;
    const requestedGameId = (payload as { gameId?: unknown }).gameId;
    if (typeof requestedGameId !== "string") return;
    const participantId = this.accountByClient.get(client.sessionId);
    if (!participantId) return;
    try {
      await this.ensureLogicalSession();
      const sessionId = this.handoffSessionId;
      if (!sessionId || sessionId !== requestedGameId || this.seatByClient.get(client.sessionId) === undefined) return;
      const now = Date.now();
      let current = this.issuedResumeCredentials.get(participantId);
      if (!current || current.expiresAt <= now) {
        const credential = randomBytes(32).toString("base64url");
        const expiresAt = now + roomResumeCredentialLifetimeMs();
        const persisted = await store.rotateResumeCredential({
          sessionId,
          participantId,
          credentialHash: createHash("sha256").update(credential).digest("hex"),
          now,
          expiresAt,
        });
        if (!persisted) return;
        current = { credential, expiresAt };
        this.issuedResumeCredentials.set(participantId, current);
      }
      client.send("roomResumeCredential", {
        gameId: sessionId,
        resumeCredential: current.credential,
        ownerEpoch: this.handoffAuthority.ownerEpoch,
        expiresAt: current.expiresAt,
      });
    } catch {
      // Never log the credential or a request payload; the feature is optional until rollout.
      this.debug("handoff.resume_credential.issue_failed");
    }
  }

  private stableHandoffParticipants(): RoomParticipant[] | undefined {
    const participants: RoomParticipant[] = [];
    for (const seat of [0, 1] as const) {
      if (this.bots[seat]) {
        const holder = this.tournamentSeatHolders[seat];
        const participantId =
          holder && "participantId" in holder ? holder.participantId : `bot:${this.state.matchLogId}:${seat}`;
        participants.push({ seat, kind: "bot", principalId: participantId });
        continue;
      }
      const client = [...this.seatByClient].find(([, seated]) => seated === seat)?.[0];
      const accountId = client ? this.accountByClient.get(client) : undefined;
      if (!accountId) return undefined;
      participants.push({ seat, kind: "account", principalId: accountId });
    }
    if (new Set(participants.map(({ principalId }) => principalId)).size !== 2) return undefined;
    return participants;
  }

  private roomMode(): string {
    if (this.isTournamentRoom) return "tournament";
    if (this.isRankedRoom) return "ranked";
    if (this.isPrivate) return "private";
    if (this.isBotRoom) return "bot";
    return "casual";
  }

  private setHandoffAwareTimeout(callback: () => void, delayMs: number): Delayed {
    const ownerEpoch = this.handoffAuthority.ownerEpoch;
    return this.clock.setTimeout(() => {
      if (!this.handoffAuthority.acceptsAuthority(ownerEpoch)) return;
      if (!this.handoffStoreInstance || this.handoffAuthority.mode === "disabled") {
        callback();
        return;
      }
      void this.ensureLogicalSession()
        .then(async () => {
          if (!this.handoffSessionId) {
            if (!this.handoffSessionAttempted || this.handoffSessionUnsupported) callback();
            return;
          }
          if ((await this.hasCurrentDurableAuthority(ownerEpoch)) && this.handoffAuthority.acceptsAuthority(ownerEpoch))
            callback();
        })
        .catch((error: unknown) => this.debugError("[AegisRoom] timer owner fence failed", error));
    }, delayMs);
  }

  private async hasCurrentDurableAuthority(ownerEpoch: number): Promise<boolean> {
    if (!this.handoffAuthority.acceptsAuthority(ownerEpoch)) return false;
    if (this.handoffSessionFailure) return false;
    if (!this.handoffSessionId || !this.handoffStoreInstance) return true;
    try {
      await this.ensureLogicalSession();
      const session = await this.handoffStoreInstance.getSession(this.handoffSessionId);
      return !!(
        session &&
        session.status === "active" &&
        session.ownerEpoch === ownerEpoch &&
        session.owner.roomId === this.roomId &&
        session.activeTransferId === null &&
        this.handoffAuthority.acceptsAuthority(ownerEpoch)
      );
    } catch (error) {
      this.debugError("[AegisRoom] durable owner fence failed", error);
      return false;
    }
  }

  /**
   * Publishes what this room is authoritative about: the outcome of the ONE game it ran.
   *
   * For a Tournament Game that is the whole story — the series module decides whether another game
   * opens, whether the confrontation is over and what a timeout means. The room does not know
   * whether this was game 2 of a best-of-three, and must not learn.
   */
  private async recordAuthoritativeResult(
    event: Extract<import("@aegis/shared").ServerEvent, { kind: "gameOver" }>,
  ): Promise<void> {
    if (this.migrationDisposal) return;
    if (!(await this.hasCurrentDurableAuthority(this.handoffAuthority.ownerEpoch))) return;
    // The Tournament Game path comes first and does not require two Accounts: a seat driven by a
    // bot has no client, so `accountByClient` holds nothing for it and the two-account guard below
    // would silently discard a perfectly good result.
    if (this.tournamentGameId) {
      // A Tournament Game ID is the durable logical result key; unlike roomId it survives a move.
      const outcome =
        event.result.outcome === "draw" ? ({ kind: "draw" } as const) : this.winnerOutcome(event.result.winnerSeat);
      if (!outcome) {
        this.debugError(
          `[AegisRoom] tournament game result UNATTRIBUTABLE gameId=${this.tournamentGameId} roomId=${this.roomId} winnerSeat=${event.result.outcome === "draw" ? "-" : event.result.winnerSeat}`,
        );
        return;
      }
      const recorded = await this.series().recordGameResult({
        gameId: this.tournamentGameId,
        roomId: this.roomId,
        outcome,
        finishedAt: Date.now(),
      });
      // A refusal here means a finished game was NOT persisted — the confrontation is now stuck
      // waiting on a result that will never arrive. It must be loud enough to alert on.
      if (!recorded.ok)
        this.debugError(
          `[AegisRoom] tournament game result REJECTED gameId=${this.tournamentGameId} roomId=${this.roomId} reason=${recorded.reason}`,
        );
      return;
    }
    const accounts = ([0, 1] as Seat[]).map((seat) => {
      const player = this.state.players[seat];
      return player ? this.accountByClient.get(player.sessionId) : undefined;
    });
    if (!accounts[0] || !accounts[1]) return;
    const ranked = ([0, 1] as Seat[]).every((seat) => {
      const player = this.state.players[seat];
      return !!player && this.rankedByClient.get(player.sessionId) === true;
    });
    const decks = ([0, 1] as Seat[]).map((seat) => {
      const player = this.state.players[seat];
      return player ? this.deckByClient.get(player.sessionId) : undefined;
    });
    const logicalMatchId = this.state.matchId || undefined;
    if (this.isTournamentRoom && this.tournamentMatchId) {
      const snapshots = decks[0] && decks[1] ? ([decks[0], decks[1]] as [DeckSnapshot, DeckSnapshot]) : undefined;
      const resultKey = logicalMatchId
        ? resultEffectIdempotencyKey(logicalMatchId, logicalMatchId, "tournament-result")
        : undefined;
      if (event.result.outcome === "draw") {
        await this.accounts().recordTournamentRoomDraw(
          this.tournamentMatchId,
          this.roomId,
          [accounts[0], accounts[1]],
          event.reason,
          snapshots,
          resultKey,
        );
        return;
      }
      const winner = event.result.winnerSeat;
      await this.accounts().recordTournamentRoomResult(
        this.tournamentMatchId,
        this.roomId,
        [accounts[0], accounts[1]],
        accounts[winner],
        event.reason,
        snapshots,
        resultKey,
      );
      return;
    }
    if (!ranked) return;
    if (event.result.outcome === "draw") {
      await this.accounts().recordMatch({
        roomId: this.roomId,
        mode: "ranked",
        playerAccountIds: [accounts[0], accounts[1]],
        reason: event.reason,
        deckSnapshots: decks[0] && decks[1] ? [decks[0], decks[1]] : undefined,
        ...(logicalMatchId
          ? { resultKey: resultEffectIdempotencyKey(logicalMatchId, logicalMatchId, "ranked-record") }
          : {}),
      });
      return;
    }
    const winner = event.result.winnerSeat;
    await this.accounts().recordMatch({
      roomId: this.roomId,
      mode: "ranked",
      playerAccountIds: [accounts[0], accounts[1]],
      winnerAccountId: accounts[winner],
      reason: event.reason,
      deckSnapshots: decks[0] && decks[1] ? [decks[0], decks[1]] : undefined,
      ...(logicalMatchId
        ? { resultKey: resultEffectIdempotencyKey(logicalMatchId, logicalMatchId, "ranked-record") }
        : {}),
    });
  }

  /**
   * Names the winning seat the way the series module can accept it: by Account when a person won,
   * by participant when a bot did.
   *
   * A seated client is preferred over the recorded holder, so the ordinary human path is unchanged.
   * `undefined` means the seat belongs to nobody the room knows about, which is never expected and
   * must not be reported as somebody else's win.
   */
  private winnerOutcome(
    winnerSeat: Seat,
  ):
    | { kind: "winner"; winnerAccountId: string }
    | { kind: "winnerParticipant"; winnerParticipantId: string }
    | undefined {
    const player = this.state.players[winnerSeat];
    const accountId = player ? this.accountByClient.get(player.sessionId) : undefined;
    if (accountId) return { kind: "winner", winnerAccountId: accountId };
    const holder = this.tournamentSeatHolders[winnerSeat];
    if (holder && "accountId" in holder) return { kind: "winner", winnerAccountId: holder.accountId };
    if (holder && "participantId" in holder)
      return { kind: "winnerParticipant", winnerParticipantId: holder.participantId };
    return undefined;
  }

  /**
   * Seats a tournament bot on its own Tournament Game authorization.
   *
   * This is the ONLY way a bot enters a tournament room, and deliberately not the path
   * {@link addBot} takes: `addBot` still refuses every tournament room, so `POST /bot/join` — the
   * one route that reaches it — cannot put a bot into a competitive event. What replaces that
   * blanket guard here is the authorization itself: the token is minted by the series module for a
   * participant of `kind: "bot"` seated in THIS game, it is single-use, and no HTTP surface can
   * obtain one. A caller without a valid token seats nothing.
   *
   * Returns false rather than throwing on every refusal, so a driver retrying a room it lost a race
   * for reads one uniform answer.
   */
  async seatTournamentBot(input: {
    gameId: string;
    authorizationToken: string;
    botOptions?: BotOptions;
  }): Promise<boolean> {
    if (!this.isTournamentRoom || this.matchStartRequested || this.handoffStoreInstance) return false;
    if (this.tournamentGameId && this.tournamentGameId !== input.gameId) return false;
    if (this.seatByClient.size + this.occupiedBotSeats().length >= 2) return false;

    // Only a bot participant may be driven from here — a human's authorization redeemed this way
    // would seat an unattended bot in a person's seat. Checked BEFORE anything is consumed:
    // `inspectAuthorization` validates without binding a room or spending the token, so a human's
    // token presented here is refused and stays usable by the person it belongs to.
    const inspected = await this.series().inspectAuthorization({
      gameId: input.gameId,
      authorizationToken: input.authorizationToken,
      roomId: this.roomId,
    });
    if (!inspected.ok || inspected.value.kind !== "bot" || !inspected.value.participantId) return false;

    const claimed = await this.series().claimGame({
      gameId: input.gameId,
      authorizationToken: input.authorizationToken,
      roomId: this.roomId,
    });
    if (!claimed.ok) return false;
    const { participantId, kind, displayName, deck } = claimed.value;
    if (kind !== "bot" || !participantId) return false;
    this.tournamentGameId = input.gameId;

    const taken = new Set<Seat>([...this.seatByClient.values(), ...this.occupiedBotSeats()]);
    const seat: Seat = taken.has(0 as Seat) ? (1 as Seat) : (0 as Seat);
    if (taken.has(seat)) return false;

    this.debug("bot.seated", { seat, deck, botOptions: input.botOptions });
    this.tournamentSeatHolders[seat] = { participantId };
    this.bots[seat] = new BotPlayer(
      seat,
      this.state,
      (intent) => {
        const result = this.applyLoggedIntent(seat, intent);
        this.rebuildClientViews();
        return result;
      },
      input.botOptions,
    );
    this.withBatch(() =>
      this.engine.seatPlayer(seat, `bot:${participantId}`, {
        displayName,
        deck: {
          mainDeck: [...deck.mainDeck],
          eggDeck: [...deck.eggDeck],
          mainDeckArts: deck.mainDeckArts?.slice(),
          eggDeckArts: deck.eggDeckArts?.slice(),
        },
      }),
    );
    // The bot announces readiness through the ordinary intent, so the ready gate closes for the
    // usual reason rather than being bypassed. Against a person that means the match starts when
    // THEY are ready (with the existing timeout as the fallback), instead of dealing them a hand
    // while their client is still loading; between two bots it means the second seat's readiness
    // starts the match, with nobody waiting on anybody.
    this.withBatch(() => this.engine.applyIntent(seat, { type: "ready" }));
    this.armReadyTimeoutIfSeated();
    return true;
  }

  private occupiedBotSeats(): Seat[] {
    return ([0, 1] as Seat[]).filter((seat) => this.bots[seat] !== undefined);
  }

  /**
   * Arms the never-readying fallback once every seat is taken.
   *
   * Counted in SEATS rather than clients: a room with one person and one bot is full, and waiting
   * for a second client that is never going to connect would hang it for the whole timeout and then
   * start anyway.
   */
  private armReadyTimeoutIfSeated(): void {
    if (this.matchStartRequested) return;
    if (this.seatByClient.size + this.occupiedBotSeats().length !== 2) return;
    this.readyTimeout?.clear();
    this.readyTimeout = this.setHandoffAwareTimeout(() => this.startMatchNow(), this.READY_TIMEOUT_SECONDS * 1000);
  }

  override onDispose(): void {
    this.debug("room.disposed");
    this.readyTimeout?.clear();
    this.waitingRoomTimeout?.clear();
    // Legacy only. A Tournament Game's room binding is permanent by design: the game either
    // finished here or is voided by the scheduler, and re-binding it to a second room would be the
    // duplicate-claim the UNIQUE room_id exists to prevent.
    if (!this.migrationDisposal && !this.tournamentGameId && this.tournamentMatchId)
      void this.accounts()
        .releaseTournamentRoom(this.tournamentMatchId, this.roomId)
        .catch((error) => this.debugError("[AegisRoom] failed to release tournament room", error));
    roomRegistry.delete(this.roomId);
    this.issuedResumeCredentials.clear();
    if (!this.migrationDisposal && this.state.roomCode) {
      roomCodes.release(this.state.roomCode);
    }
  }

  /** Freeze this physical owner before a transfer coordinator persists its frozen barrier. */
  freezeForHandoff(ownerEpoch = this.handoffAuthority.ownerEpoch, transferId?: string): boolean {
    if (!this.handoffSessionId || this.state.gameOver || !this.handoffAuthority.freeze(ownerEpoch)) return false;
    this.handoffTransferId = transferId;
    this.handoffPausedAtMs = transferId === undefined ? undefined : Date.now();
    return true;
  }

  /** A privacy-safe eligibility result for the authenticated deployment coordinator. */
  async inspectHandoffCompatibility(sessionId: string): Promise<{ eligible: boolean; reasonCode?: string }> {
    if (!this.handoffStoreInstance || !this.handoffSessionId || this.handoffSessionId !== sessionId)
      return { eligible: false, reasonCode: "session_not_registered" };
    if (this.handoffAuthority.mode !== "active") return { eligible: false, reasonCode: "source_not_active" };
    if (this.roomMode() !== "casual" && this.roomMode() !== "ranked")
      return { eligible: false, reasonCode: "unsupported_room_mode" };
    if (this.state.phase !== Phase.Main || this.state.gameOver)
      return { eligible: false, reasonCode: "unsupported_phase" };
    if (this.state.pendingDecision !== undefined || this.state.combatWindow !== undefined)
      return { eligible: false, reasonCode: "pending_decision_or_combat" };
    if (
      this.unsequencedHandoffIntentCount > 0 ||
      this.currentBatch !== undefined ||
      this.batchDepth !== 0 ||
      this.engine.mainVerbContinuationsInFlight !== 0 ||
      this.engine.counterResolutionInFlight ||
      this.engine.optionResolutionDepth !== 0 ||
      this.engine.effectResolutionDepth !== 0 ||
      this.engine.mainEntryPending
    )
      return { eligible: false, reasonCode: "execution_not_quiescent" };
    const session = await this.handoffStoreInstance.getSession(sessionId);
    if (
      !session ||
      session.status !== "active" ||
      session.ownerEpoch !== this.handoffAuthority.ownerEpoch ||
      session.owner.roomId !== this.roomId ||
      session.activeTransferId !== null
    )
      return { eligible: false, reasonCode: "stale_source_owner" };
    if (session.participants.some((participant) => participant.kind !== "account"))
      return { eligible: false, reasonCode: "unsupported_participant" };
    return { eligible: true };
  }

  /** Return authority to the source after a pre-claim abort was committed in the store. */
  async unfreezeAfterAbortedHandoff(): Promise<boolean> {
    const sessionId = this.handoffSessionId;
    const store = this.handoffStoreInstance;
    const ownerEpoch = this.handoffAuthority.ownerEpoch;
    if (!sessionId || !store || !["frozen", "active"].includes(this.handoffAuthority.mode)) return false;
    const session = await store.getSession(sessionId);
    const transfer = this.handoffTransferId ? await store.getTransfer(this.handoffTransferId) : undefined;
    if (
      !session ||
      (this.handoffTransferId !== undefined && transfer?.status !== "aborted") ||
      session.status !== "active" ||
      session.ownerEpoch !== ownerEpoch ||
      session.owner.roomId !== this.roomId ||
      session.activeTransferId !== null ||
      (this.handoffAuthority.mode === "frozen" && !this.handoffAuthority.unfreeze(ownerEpoch))
    )
      return false;
    if (this.handoffAuthority.mode === "active") return true;
    this.handoffTransferId = undefined;
    this.handoffPausedAtMs = undefined;

    if (!this.matchStartRequested) {
      if (!this.isTournamentRoom && this.devScenario === undefined) {
        this.waitingRoomTimeout?.clear();
        this.waitingRoomTimeout = this.setHandoffAwareTimeout(() => {
          if (!this.matchStartRequested) void this.disconnect();
        }, WAITING_ROOM_TIMEOUT_SECONDS * 1000);
      }
      this.armReadyTimeoutIfSeated();
    } else {
      this.combatWindowTimeout?.clear();
      this.combatWindowTimeout = undefined;
      this.combatWindowTimeoutKey = undefined;
      this.syncCombatWindowTimeout();
    }
    return true;
  }

  /** Persist only a quiescent boundary the experiment can faithfully restore. */
  async saveStoppedMainCheckpoint(input: {
    executionVersion: string;
    rulesVersion: string;
    sourceRevision: string;
    commandSequence: number;
  }): Promise<boolean> {
    const store = this.handoffStoreInstance;
    const sessionId = this.handoffSessionId;
    const transferId = this.handoffTransferId;
    const ownerEpoch = this.handoffAuthority.ownerEpoch;
    if (
      !store ||
      !sessionId ||
      !transferId ||
      this.handoffPausedAtMs === undefined ||
      this.state.matchId !== sessionId ||
      this.isPrivate ||
      this.isBotRoom ||
      this.bots.some((bot) => bot !== undefined) ||
      (this.isTournamentRoom && !this.tournamentGameId) ||
      this.handoffAuthority.mode !== "frozen" ||
      this.unsequencedHandoffIntentCount > 0 ||
      this.state.phase !== Phase.Main ||
      this.state.gameOver ||
      this.state.pendingDecision !== undefined ||
      this.state.combatWindow !== undefined
    )
      return false;
    await this.engine.mainVerbChain;
    if (
      this.engine.mainVerbContinuationsInFlight !== 0 ||
      this.engine.counterResolutionInFlight ||
      this.engine.optionResolutionDepth !== 0 ||
      this.engine.effectResolutionDepth !== 0 ||
      this.engine.mainEntryPending
    )
      return false;
    let snapshot;
    try {
      const boundary = exportStoppedMainBoundary(this.state);
      snapshot = {
        ...boundary,
        runtime: {
          protocol: ROOM_RUNTIME_PROTOCOL,
          version: 1,
          transferId,
          pausedAtMs: this.handoffPausedAtMs,
          engine: this.engine.exportContinuityState(),
          botRoster: null,
        } satisfies RoomRuntimeContinuityFrame,
      };
    } catch {
      return false;
    }
    const session = await store.getSession(sessionId);
    const transfer = await store.getTransfer(transferId);
    if (
      !session ||
      !transfer ||
      transfer.sessionId !== sessionId ||
      transfer.fromOwnerEpoch !== ownerEpoch ||
      transfer.from.roomId !== this.roomId ||
      transfer.status !== "frozen" ||
      session.status !== "active" ||
      session.ownerEpoch !== ownerEpoch ||
      session.owner.roomId !== this.roomId ||
      session.activeTransferId !== transferId
    )
      return false;
    const saved = await store.saveCheckpoint({
      sessionId,
      ownerEpoch,
      checkpointId: randomUUID(),
      snapshotSchemaVersion: ROOM_HANDOFF_SNAPSHOT_VERSION,
      executionVersion: input.executionVersion,
      rulesVersion: input.rulesVersion,
      sourceRevision: input.sourceRevision,
      commandSequence: input.commandSequence,
      checksum: checkpointDigest(snapshot),
      snapshot: snapshot as unknown as import("../db/roomHandoff/RoomHandoffStore.js").JsonValue,
      now: Date.now(),
    });
    return saved.ok;
  }

  /**
   * Restore the deliberately narrow stopped-Main experiment into an inert destination room.
   * This is an in-process server seam, not a client option or HTTP operation. The destination
   * remains unable to authenticate, mutate state, or run timers until activatePreparedHandoff.
   */
  async prepareFromHandoffCheckpoint(input: {
    sessionId: string;
    transferId: string;
    ownerEpoch: number;
    executionVersion: string;
    rulesVersion: string;
    sourceRevision: string;
  }): Promise<boolean> {
    const store = this.handoffStoreInstance;
    if (!store || this.handoffAuthority.mode !== "prepared" || this.isPrivate || this.isBotRoom) return false;
    const restored = await loadPreparedMainCheckpoint(store, {
      sessionId: input.sessionId,
      transferId: input.transferId,
      expectedOwnerEpoch: input.ownerEpoch,
      expectedRoomId: this.roomId,
      expectedExecutionVersion: input.executionVersion,
      expectedRulesVersion: input.rulesVersion,
      expectedSourceRevision: input.sourceRevision,
    });
    if (!restored) return false;
    if (checkpointDigest(restored.checkpoint.snapshot) !== restored.checkpoint.checksum) return false;
    const restoredRuntime = restoreRoomRuntimeFrame(
      (restored.checkpoint.snapshot as unknown as Record<string, unknown>).runtime,
      input.transferId,
    );
    const runtime =
      restoredRuntime?.transferId === COMMAND_CHECKPOINT_TRANSFER_ID
        ? { ...restoredRuntime, transferId: input.transferId, pausedAtMs: restored.transfer.startedAt }
        : restoredRuntime;
    if (!runtime || runtime.botRoster !== null || restored.session.participants.some((p) => p.kind !== "account"))
      return false;
    const modeSupported =
      (restored.session.mode === "casual" && !this.isRankedRoom && !this.isTournamentRoom) ||
      (restored.session.mode === "ranked" && this.isRankedRoom && !this.isTournamentRoom) ||
      (restored.session.mode === "tournament" &&
        this.isTournamentRoom &&
        restored.session.tournamentGameId !== null &&
        restored.session.tournamentMatchId !== null);
    if (!modeSupported) return false;

    this.waitingRoomTimeout?.clear();
    this.waitingRoomTimeout = undefined;
    this.readyTimeout?.clear();
    this.readyTimeout = undefined;
    this.combatWindowTimeout?.clear();
    this.combatWindowTimeout = undefined;
    this.combatWindowTimeoutKey = undefined;
    const restoredEngine = this.createEngine(this.engineSeed, restored.state);
    try {
      restoredEngine.restoreContinuityState(runtime.engine);
    } catch {
      return false;
    }
    this.setState(restored.state);
    this.engine = restoredEngine;
    this.handoffSessionId = input.sessionId;
    this.handoffTransferId = input.transferId;
    this.handoffPausedAtMs = runtime.pausedAtMs;
    this.handoffRuntimeFrame = runtime;
    this.handoffParticipants = restored.session.participants;
    this.handoffRestored = true;
    this.tournamentMatchId = restored.session.tournamentMatchId ?? undefined;
    this.tournamentGameId = restored.session.tournamentGameId ?? undefined;
    if (this.tournamentGameId) {
      for (const participant of restored.session.participants)
        if (participant.kind === "account")
          this.tournamentSeatHolders[participant.seat] = { accountId: participant.principalId };
    }
    this.unsequencedHandoffIntentCount = 0;
    this.handoffAuthority = new RoomHandoffLifecycle({
      enabled: true,
      ownerEpoch: input.ownerEpoch,
      mode: "prepared",
    });
    this.matchStartRequested = true;
    return true;
  }

  /** Activate only after the durable owner switch completed and its active-transfer barrier cleared. */
  async activatePreparedHandoff(ownerEpoch: number, pauseReceipt?: MigrationPauseReceipt): Promise<boolean> {
    if (!this.handoffSessionId || !this.handoffTransferId || !this.handoffStoreInstance) return false;
    const session = await this.handoffStoreInstance.getSession(this.handoffSessionId);
    const transfer = await this.handoffStoreInstance.getTransfer(this.handoffTransferId);
    const transferReady = !!(
      transfer &&
      transfer.toOwnerEpoch === ownerEpoch &&
      transfer.to.roomId === this.roomId &&
      ((transfer.status === "destination_active" && session?.activeTransferId === this.handoffTransferId) ||
        (transfer.status === "completed" && session?.activeTransferId === null))
    );
    if (
      !session ||
      session.status !== "active" ||
      session.ownerEpoch !== ownerEpoch ||
      session.owner.roomId !== this.roomId ||
      !transferReady
    )
      return false;
    if (this.handoffAuthority.mode === "active" && this.handoffAuthority.ownerEpoch === ownerEpoch) return true;
    if (!(await this.recoverAdmittedCommand(ownerEpoch))) return false;
    if (this.tournamentGameId) {
      if (!this.handoffRuntimeFrame || !pauseReceipt) return false;
      let receipt: MigrationPauseReceipt;
      try {
        receipt = restoreMigrationPauseReceipt(pauseReceipt);
      } catch {
        return false;
      }
      if (receipt.transferId !== this.handoffTransferId || receipt.pausedAtMs !== this.handoffRuntimeFrame.pausedAtMs)
        return false;
      const rebound = await this.series().rebindGameRoomForHandoff({
        gameId: this.tournamentGameId,
        sessionId: this.handoffSessionId,
        transferId: this.handoffTransferId,
        fromRoomId: transfer!.from.roomId,
        toRoomId: this.roomId,
        ownerEpoch,
      });
      if (!rebound.ok) return false;
      const series = await this.series().seriesForGame(this.tournamentGameId);
      if (!series || series.matchId !== session.tournamentMatchId) return false;
      if (series.seriesDeadlineAt !== null) {
        const compensated = await this.series().compensateSeriesDeadline({
          seriesId: series.id,
          transferId: receipt.transferId,
          pausedAtMs: receipt.pausedAtMs,
          resumedAtMs: receipt.resumedAtMs,
        });
        if (!compensated.ok) return false;
      }
    }
    return this.handoffAuthority.activate(ownerEpoch);
  }

  /**
   * Dispose an old owner only after the durable claim moved elsewhere. The local onLeave/onDispose
   * hooks then suppress abandonment, results, tournament unlink, and private-code unlink.
   */
  async disposeAfterHandoff(nextOwnerEpoch: number): Promise<boolean> {
    if (!this.handoffSessionId || !this.handoffStoreInstance || this.migrationDisposal) return false;
    const session = await this.handoffStoreInstance.getSession(this.handoffSessionId);
    const previousEpoch = this.handoffAuthority.ownerEpoch;
    if (
      !session ||
      session.ownerEpoch !== nextOwnerEpoch ||
      nextOwnerEpoch <= previousEpoch ||
      session.owner.roomId === this.roomId ||
      !this.handoffAuthority.migrate(previousEpoch, nextOwnerEpoch)
    )
      return false;
    this.migrationDisposal = true;
    await this.disconnect();
    return true;
  }

  override onJoin(client: Client, options: AegisJoinOptions): void {
    if (!this.handoffAuthority.acceptsAuthority(this.handoffAuthority.ownerEpoch)) return;
    if (this.handoffSessionId && !this.prevalidatedJoinSessions.has(client.sessionId)) {
      const ownerEpoch = this.handoffAuthority.ownerEpoch;
      void this.hasCurrentDurableAuthority(ownerEpoch).then((current) => {
        if (!current || !this.handoffAuthority.acceptsAuthority(ownerEpoch)) return;
        this.prevalidatedJoinSessions.add(client.sessionId);
        this.onJoin(client, options);
        this.prevalidatedJoinSessions.delete(client.sessionId);
      });
      return;
    }
    this.debug("player.join", { sessionId: client.sessionId, deck: options.deck });
    // The room type, not the payload, decides whether unreleased cards are legal: a private
    // room accepts them and its clients never send the flag (onAuth already vetted the pair).
    if (this.isBetaBattleRoom) options = { ...options, betaBattleMode: true };
    this.rankedByClient.set(client.sessionId, options.ranked === true);
    this.deckByClient.set(client.sessionId, {
      deckId: options.deckId ?? null,
      deckName: options.deckName ?? "Deck sem nome",
      mainDeck: [...options.deck.mainDeck],
      eggDeck: [...options.deck.eggDeck],
      mainDeckArts: options.deck.mainDeckArts?.slice(),
      eggDeckArts: options.deck.eggDeckArts?.slice(),
    });
    // Assign the first free seat instead of using clients.length - 1, which
    // breaks when a client disconnects and reconnects (e.g. React StrictMode
    // double-mounts, or genuine network reconnect).
    // Bot seats count as taken: a tournament bot may already be driving seat 0.
    const taken = new Set<Seat>([...this.seatByClient.values(), ...this.occupiedBotSeats()]);
    const accountId = this.accountByClient.get(client.sessionId);
    const restoredSeat = this.handoffParticipants?.find(
      (participant) => participant.kind === "account" && participant.principalId === accountId,
    )?.seat;
    let seat: Seat = restoredSeat ?? (taken.has(0) ? 1 : 0);
    if (restoredSeat !== undefined && taken.has(restoredSeat)) {
      this.debug("handoff.join.rejected", { accountId, seat: restoredSeat, reason: "seat already reattached" });
      return;
    }

    // A real reconnection is handled by allowReconnection() in onLeave. If a
    // staged PlayerState remains in a now-free seat, this is a replacement
    // player and their own identity/deck must replace the departed player's.
    const existing = this.state.players[seat];
    if (restoredSeat !== undefined && existing) {
      this.debug("handoff.player.reattached", { sessionId: client.sessionId, seat });
      existing.sessionId = client.sessionId;
      this.seatByClient.set(client.sessionId, seat);
      client.view = this.engine.makeStateView(seat);
      this.withBatch(() => this.engine.handleReconnect(seat));
    } else if (existing && existing.sessionId !== client.sessionId) {
      this.debug(
        `[AegisRoom] onJoin sessionId=${client.sessionId} seat=${seat} → replacing departed player ${existing.sessionId}`,
      );
      this.seatByClient.set(client.sessionId, seat);
      this.withBatch(() => this.engine.seatPlayer(seat, client.sessionId, options));
      client.view = this.engine.makeStateView(seat);
    } else {
      this.debug(
        `[AegisRoom] onJoin sessionId=${client.sessionId} seat=${seat} takenSeats=[${[...taken].join(",")}] totalClients=${this.clients.length} allSessionIds=[${this.clients.map((c) => c.sessionId).join(", ")}]`,
      );
      this.seatByClient.set(client.sessionId, seat);
      this.withBatch(() => this.engine.seatPlayer(seat, client.sessionId, options));
      // Per-client visibility: hide hidden zones from the other seat.
      client.view = this.engine.makeStateView(seat);
    }
    if (this.tournamentGameId && accountId) this.tournamentSeatHolders[seat] = { accountId };
    // The match starts once both seats have sent `ready` (GameEngineHooks.onBothReady),
    // not on join — starting on join races the client's asset loading against the
    // mulligan window. Arm a fallback so a stuck/never-readying client can't hang the
    // room forever.
    this.armReadyTimeoutIfSeated();
    void this.ensureLogicalSession().catch((error: unknown) =>
      this.debugError("[AegisRoom] failed to create logical room session", error),
    );
  }

  /** A hand-laid board instead of the pre-game procedure; bot rooms outside production only. */
  private startDevScenarioNow(scenario: DevScenarioId): void {
    if (this.matchStartRequested) return;
    this.matchStartRequested = true;
    this.readyTimeout?.clear();
    this.readyTimeout = undefined;
    this.withBatch(() => this.engine.startDevScenario(scenario));
  }

  /** Idempotent: only the first caller (ready-gate or timeout) actually starts the match. */
  private startMatchNow(): void {
    if (!this.handoffAuthority.acceptsAuthority(this.handoffAuthority.ownerEpoch)) return;
    if (this.matchStartRequested) return;
    this.matchStartRequested = true;
    this.readyTimeout?.clear();
    this.readyTimeout = undefined;
    // Advertise that the game is genuinely under way, so a scheduler can tell a room that never
    // started apart from one that started and stopped reporting.
    if (this.tournamentGameId)
      void this.series()
        .markGamePlaying(this.tournamentGameId, this.roomId)
        .catch((error: unknown) => this.debugError("[AegisRoom] failed to mark tournament game playing", error));
    this.withBatch(() => this.engine.startMatch());
  }

  override async onLeave(client: Client, consented: boolean): Promise<void> {
    if (
      this.migrationDisposal ||
      this.handoffAuthority.mode === "prepared" ||
      this.handoffAuthority.mode === "frozen" ||
      this.handoffAuthority.mode === "migrated"
    )
      return;
    const ownerEpoch = this.handoffAuthority.ownerEpoch;
    if (!(await this.hasCurrentDurableAuthority(ownerEpoch))) return;
    const seat = this.seatByClient.get(client.sessionId);
    const accountId = this.accountByClient.get(client.sessionId);
    const countsAsDodge =
      this.isRankedRoom && this.matchStartRequested && !this.state.gameOver && accountId !== undefined;
    this.debug(
      `[AegisRoom] onLeave sessionId=${client.sessionId} seat=${seat} consented=${consented} totalClients=${this.clients.length}`,
    );
    if (seat === undefined) {
      this.accountByClient.delete(client.sessionId);
      this.rankedByClient.delete(client.sessionId);
      return;
    }

    // A consented leave (tab closed, surrender) is a real departure.
    if (consented) {
      if (!this.matchStartRequested) {
        this.readyTimeout?.clear();
        this.readyTimeout = undefined;
      } else {
        await this.lock();
        if (!(await this.hasCurrentDurableAuthority(ownerEpoch))) return;
      }
      this.seatByClient.delete(client.sessionId);
      this.withBatch(() => {
        this.engine.clearReady(seat);
        this.engine.handleDisconnect(seat, true);
      });
      if (countsAsDodge && accountId && (await this.hasCurrentDurableAuthority(ownerEpoch)))
        await this.accounts().recordRankedDodge(this.roomId, accountId);
      this.accountByClient.delete(client.sessionId);
      this.rankedByClient.delete(client.sessionId);
      return;
    }

    // Unexpected drop: mark the seat disconnected (so the opponent sees it) and
    // hold it open for a grace period. The client keeps its seat mapping so a
    // reconnect via token resumes here without going through onJoin.
    this.readyTimeout?.clear();
    this.readyTimeout = undefined;
    await this.lock();
    if (!(await this.hasCurrentDurableAuthority(ownerEpoch))) return;
    this.withBatch(() => this.engine.handleDisconnect(seat, false));
    try {
      await this.allowReconnection(client, this.RECONNECT_GRACE_SECONDS);
      if (!(await this.hasCurrentDurableAuthority(ownerEpoch))) return;
      this.debug(`[AegisRoom] reconnected sessionId=${client.sessionId} seat=${seat}`);
      this.withBatch(() => this.engine.handleReconnect(seat));
      if (!this.matchStartRequested) {
        await this.unlock();
        if (this.clients.length === 2)
          this.readyTimeout = this.setHandoffAwareTimeout(
            () => this.startMatchNow(),
            this.READY_TIMEOUT_SECONDS * 1000,
          );
      }
      client.view = this.engine.makeStateView(seat);
      this.resendOpenPrompts(client, seat);
    } catch {
      if (!(await this.hasCurrentDurableAuthority(ownerEpoch))) return;
      // Grace elapsed (or room disposed) without a reconnect: resolve as a real
      // departure — the opponent wins an in-progress match.
      this.debug(`[AegisRoom] reconnect grace elapsed sessionId=${client.sessionId} seat=${seat}`);
      this.seatByClient.delete(client.sessionId);
      this.readyTimeout?.clear();
      this.readyTimeout = undefined;
      this.withBatch(() => {
        this.engine.clearReady(seat);
        this.engine.handleDisconnect(seat, true);
      });
      if (countsAsDodge && accountId && (await this.hasCurrentDurableAuthority(ownerEpoch)))
        await this.accounts().recordRankedDodge(this.roomId, accountId);
      this.accountByClient.delete(client.sessionId);
      this.rankedByClient.delete(client.sessionId);
      if (!this.matchStartRequested) await this.unlock();
    }
  }

  /**
   * Seat a bot as seat 1 and start the match. The room must have exactly one
   * human player already seated. Idempotent: a second call is a no-op.
   */
  addBot(botDeckId?: string): boolean {
    // Ordinary casual rooms remain accepted during the expand/contract rollout so
    // a tab with the previous web bundle can still start its bot match. New clients
    // create an isolated bot room and therefore never enter the casual queue.
    // Tournament rooms stay refused here, and that refusal is what `POST /bot/join` inherits. A
    // tournament bot is seated only through seatTournamentBot(), against an authorization no HTTP
    // caller can obtain.
    if (
      this.handoffStoreInstance ||
      this.isRankedRoom ||
      this.isTournamentRoom ||
      this.isPrivate ||
      this.clients.length !== 1
    )
      return false;

    // Reloads and reconnections can repeat /bot/join for the same match.
    // Acknowledge the existing bot without replacing it or restarting the engine.
    if (this.bots[this.BOT_SEAT] !== undefined) return true;

    // Resolve the deck before anything is mutated: an unplayable preset degrades to the
    // random pool inside playableBotDeck, and any remaining failure must leave the room
    // exactly as it was rather than half-seated.
    let deck;
    try {
      deck = playableBotDeck(botDeckId, this.isBetaBattleRoom);
    } catch (error) {
      logError("[AegisRoom] addBot could not resolve a legal bot deck", error);
      return false;
    }

    this.bots[this.BOT_SEAT] = new BotPlayer(this.BOT_SEAT, this.state, (intent) => {
      const result = this.applyLoggedIntent(this.BOT_SEAT, intent);
      // After each bot action, rebuild every human client's StateView so that
      // CardInstances moved from the bot's private hand into public positions
      // (battleArea, breeding) are recognised as newly-visible by @colyseus/schema
      // and included in the next patch with their full state.
      this.rebuildClientViews();
      return result;
    });

    this.debug("bot.seated", { seat: this.BOT_SEAT, deck });
    try {
      this.withBatch(() =>
        this.engine.seatPlayer(this.BOT_SEAT, "bot", {
          displayName: "Bot",
          deck,
          betaBattleMode: this.isBetaBattleRoom,
        }),
      );
    } catch (error) {
      // Seating is the last thing that can reject the deck. Releasing the bot slot keeps
      // the room retryable — the idempotence check above would otherwise report a bot that
      // was never seated, leaving the player waiting on an opponent that cannot arrive.
      this.bots[this.BOT_SEAT] = undefined;
      logError("[AegisRoom] addBot failed to seat the bot", error);
      return false;
    }

    // The bot never sends its own `ready` intent (it isn't a Colyseus client, so it
    // has no seatByClient entry for applyIntent to route through) — starting the
    // match directly here is the bot seat's stand-in for readiness.
    if (this.devScenario !== undefined) this.startDevScenarioNow(this.devScenario);
    else this.startMatchNow();
    return true;
  }

  /**
   * Bring every connected client's StateView up to date with the current state.
   *
   * Refreshes each client's EXISTING view in place (`GameEngine.refreshStateView`)
   * rather than replacing it with a fresh one. Replacing it wholesale — the prior
   * behavior — loses the view's memory of which cards it had already made visible,
   * so a card that just left a `@view`-tagged zone (e.g. played from hand) is no
   * longer visible to the freshly-built view at the exact moment its removal needs
   * encoding, and the encoder silently drops the delete: the client's copy of the
   * hand keeps the card forever, permanently out of sync with the (correct)
   * server state. `onJoin`/reconnect still build a fresh view because those send a
   * full snapshot rather than a delta, so there is nothing to lose there.
   */
  private rebuildClientViews(): void {
    for (const client of this.clients) {
      const seat = this.seatByClient.get(client.sessionId);
      if (seat === undefined) continue;
      if (client.view) {
        this.engine.refreshStateView(client.view, seat);
      } else {
        client.view = this.engine.makeStateView(seat);
      }
    }
  }

  /**
   * The mutation seam's VisibilityPort: fan one card arrival out to every connected client's
   * view. Installed on the engine in `onCreate`.
   *
   * This is what replaced walking every private zone before every patch. `StateView.add`
   * force-queues an ADD for every field of the object it is given, so the old per-patch walk
   * made each patch re-encode the entire state for both seats — the client then spent all of
   * its main thread in the schema decoder. Exposing a card once, when it actually arrives,
   * carries the same information at a fraction of the bytes.
   */
  private readonly exposeCardToClients: VisibilityPort = (ownerSeat, zone, card) => {
    for (const client of this.clients) {
      const viewerSeat = this.seatByClient.get(client.sessionId);
      if (viewerSeat === undefined || client.view === undefined) continue;
      this.engine.exposeCardToView(client.view, viewerSeat, ownerSeat, zone, card);
    }
  };

  /**
   * Refresh the public per-zone count mirrors before every state broadcast. The
   * hidden zones (deck/hand/security) are redacted per seat, so only these counts
   * convey their sizes to the opponent; recomputing here keeps them in lockstep with
   * the arrays after any mutation an intent caused (API-CONTRACT "Visibility";
   * ARCHITECTURE.md section 6). Colyseus calls this once per patch.
   */
  override onBeforePatch(): void {
    this.engine.syncCounts();
    // Refresh every view before the patch is encoded, not only after the three events that
    // happen to name a move. A StateView must still recognise a card as visible at the moment
    // its removal is encoded, or the encoder drops the delete and the client's copy of the
    // hand keeps the card forever (see rebuildClientViews). Any hand-emptying path whose
    // event is not `cardPlayed`/`cardsMoved`/`digivolved` — a cost paid mid-effect, a card
    // placed under a permanent by a watcher — used to strand exactly that way, so each such
    // move left one more phantom copy in the player's own hand. Refreshing per patch closes
    // the whole class: `unlockInto` is add-only and idempotent, so this is safe to repeat.
    this.rebuildClientViews();
  }

  /**
   * Run one entry into the engine as a single batch of events.
   *
   * Every path from this room into `GameEngine` that can emit goes through here, so the
   * batch boundary is the rules boundary rather than the patch tick. A nested entry — a bot
   * acting from a settled action while the batch that settled it is still open — reuses the
   * open batch, because it is part of the same moment for the player watching.
   */
  private withBatch<T>(run: () => T, recipient?: Client): T {
    const opened = this.currentBatch ?? this.openBatch(recipient);
    this.batchDepth += 1;
    try {
      return withMatchLog(this.state.matchLogId, this.roomId, run);
    } finally {
      this.batchDepth -= 1;
      if (this.batchDepth === 0 && this.currentBatch === opened) this.closeBatch();
    }
  }

  private openBatch(recipient?: Client): OpenBatch {
    this.batchSeq += 1;
    this.currentBatch = { id: `batch-${this.batchSeq}`, emitted: 0, lastSeq: 0, recipient };
    return this.currentBatch;
  }

  /**
   * Put the envelope on an event and count it into the open batch.
   *
   * An event emitted with no batch open — the tail of an asynchronous resolution, which
   * continues after the intent that started it has returned — gets a batch of its own,
   * closed once the synchronous burst it belongs to has finished emitting.
   */
  private stamp(event: ServerEvent): SequencedServerEvent {
    const batch = this.currentBatch ?? this.openImplicitBatch();
    this.eventSeq += 1;
    batch.emitted += 1;
    batch.lastSeq = this.eventSeq;
    const stamped = { ...event, seq: this.eventSeq, batch: batch.id, stateVersion: this.state.stateVersion };
    this.debug("engine.event", stamped);
    return stamped;
  }

  private openImplicitBatch(): OpenBatch {
    const batch = this.openBatch();
    queueMicrotask(() => {
      // An explicit entry that started inside this batch owns the close instead.
      if (this.batchDepth === 0 && this.currentBatch === batch) this.closeBatch();
    });
    return batch;
  }

  /**
   * End the open batch. A batch that emitted nothing (a rejected intent, a join) is closed
   * silently: there is nothing for a client to group.
   *
   * The close is broadcast with `afterNextPatch`, so it reaches clients only after the state
   * patch carrying the batch's mutations — the client narrating the batch then knows which
   * board it is narrating over. A batch belonging to one client is sent directly: it changed
   * no shared state, so there is no patch to wait for.
   */
  private closeBatch(): void {
    const batch = this.currentBatch;
    this.currentBatch = undefined;
    if (!batch || batch.emitted === 0) return;
    if (!batch.recipient) this.state.stateVersion += 1;
    const closed: ServerEvent = {
      kind: "batchClosed",
      batch: batch.id,
      stateVersion: this.state.stateVersion,
      lastSeq: batch.lastSeq,
    };
    if (batch.recipient) {
      batch.recipient.send(EVENT_CHANNEL, this.stampClose(closed, batch));
      return;
    }
    this.broadcast(EVENT_CHANNEL, this.stampClose(closed, batch), { afterNextPatch: true });
  }

  /** The close is part of the batch it ends, so it takes the next `seq` and that batch's id. */
  private stampClose(event: ServerEvent, batch: OpenBatch): SequencedServerEvent {
    this.eventSeq += 1;
    const stamped = { ...event, seq: this.eventSeq, batch: batch.id, stateVersion: this.state.stateVersion };
    this.debug("engine.event", stamped);
    return stamped;
  }

  /**
   * Hand a resumed client everything still open on it: the pending decision, the open combat
   * prompt, and the security check it may have reconnected into. Their richer channel messages
   * were sent while this socket was down and are never redelivered.
   */
  private resendOpenPrompts(client: Client, seat: Seat): void {
    const pending = this.state.pendingDecision;
    const request = this.pendingDecisionRequest;
    if (pending && pending.seat === seat && request?.decisionId === pending.decisionId) {
      client.send(DECISION_CHANNEL, { ...request, stateVersion: this.state.stateVersion });
    }
    // Not gated on the seat: a check is a scene both sides watch, and the attacker's client
    // holds its own view of it open just as the defender's does.
    const reveal = this.openSecurityReveal;
    if (reveal) this.withBatch(() => client.send(EVENT_CHANNEL, this.stamp(reveal)), client);
    const window = this.state.combatWindow;
    if (!window || window.seat !== seat) return;
    const event = combatWindowEvent(window);
    if (event) this.withBatch(() => client.send(EVENT_CHANNEL, this.stamp(event)), client);
  }

  /**
   * Keep the answer-timeout armed for exactly the combat window that is open. Driven off the
   * mirrored state rather than off individual event kinds, so every way a window closes — an
   * answer, an attack that ended early, the match ending — disarms it.
   */
  private syncCombatWindowTimeout(): void {
    const window = this.state.combatWindow;
    const key = window ? combatWindowKey(window) : undefined;
    if (key === this.combatWindowTimeoutKey) return;
    this.combatWindowTimeout?.clear();
    this.combatWindowTimeout = undefined;
    this.combatWindowTimeoutKey = key;
    if (key === undefined) return;
    this.combatWindowTimeout = this.setHandoffAwareTimeout(() => {
      this.combatWindowTimeout = undefined;
      this.combatWindowTimeoutKey = undefined;
      this.withBatch(() => this.engine.expireCombatWindow());
    }, this.COMBAT_WINDOW_TIMEOUT_SECONDS * 1000);
  }

  private debug(...data: unknown[]): void {
    withMatchLog(this.state.matchLogId, this.roomId, () => log(...data));
  }

  private handlePresentationReport(client: Client, payload: unknown): void {
    const seat = this.seatByClient.get(client.sessionId);
    if (seat === undefined) return;
    const report = parsePresentationReport(payload);
    if (!report) return;
    const now = Date.now();
    let window = this.presentationLogWindows.get(seat);
    if (!window || now - window.start >= 1000) {
      window = { start: now, count: 0 };
      this.presentationLogWindows.set(seat, window);
    }
    if (++window.count > 500) return;
    this.debug("client.animation", {
      seat,
      sessionId: client.sessionId,
      serverStateVersion: this.state.stateVersion,
      ...report,
    });
  }

  private debugError(...data: unknown[]): void {
    withMatchLog(this.state.matchLogId, this.roomId, () => logError(...data));
  }

  private applyLoggedIntent(seat: Seat, intent: Intent) {
    return withMatchLog(this.state.matchLogId, this.roomId, () => {
      const started = performance.now();
      log("intent.received", { seat, intent, stateVersion: this.state.stateVersion });
      try {
        const result = this.withBatch(() => this.engine.applyIntent(seat, intent));
        if (result.ok && this.handoffSessionId) this.unsequencedHandoffIntentCount += 1;
        log("intent.result", {
          seat,
          type: intent.type,
          result,
          durationMs: performance.now() - started,
          stateVersion: this.state.stateVersion,
        });
        return result;
      } catch (error) {
        logError("intent.failed", { seat, intent }, error);
        throw error;
      }
    });
  }

  private handleIntent(client: Client, intent: Intent): void {
    const seat = this.seatByClient.get(client.sessionId);
    if (seat === undefined) return;
    const decisionId =
      intent.type === "respondDecision"
        ? intent.decisionId
        : intent.type === "mulligan"
          ? this.state.pendingDecision?.decisionId
          : undefined;
    const ownerEpoch = this.handoffAuthority.ownerEpoch;
    if (this.commandQuarantined) {
      this.rejectClientIntent(client, intent, decisionId, "room_command_recovery_required");
      return;
    }
    if (!this.handoffAuthority.acceptsAuthority(ownerEpoch)) {
      this.rejectClientIntent(client, intent, decisionId, "room_handoff_frozen");
      return;
    }
    if (this.handoffStoreInstance) {
      this.rejectClientIntent(client, intent, decisionId, "durable_command_required");
      return;
    }
    if (!this.handoffStoreInstance) {
      const result = this.applyLoggedIntent(seat, intent);
      if (!result.ok) this.rejectClientIntent(client, intent, decisionId, result.reason);
      return;
    }
    void this.applyFencedIntent(client, seat, intent, decisionId, ownerEpoch).catch((error: unknown) => {
      this.debugError("[AegisRoom] fenced intent failed", error);
      this.rejectClientIntent(client, intent, decisionId, "room_not_authoritative");
    });
  }

  private async applyFencedIntent(
    client: Client,
    seat: Seat,
    intent: Intent,
    decisionId: string | undefined,
    ownerEpoch: number,
  ): Promise<void> {
    await this.ensureLogicalSession();
    if (!this.handoffAuthority.acceptsAuthority(ownerEpoch)) {
      this.rejectClientIntent(client, intent, decisionId, "room_handoff_frozen");
      return;
    }
    if (this.handoffSessionId && !(await this.hasCurrentDurableAuthority(ownerEpoch))) {
      this.rejectClientIntent(client, intent, decisionId, "room_not_authoritative");
      return;
    }
    if (this.seatByClient.get(client.sessionId) !== seat) return;
    const result = this.applyLoggedIntent(seat, intent);
    if (!result.ok) this.rejectClientIntent(client, intent, decisionId, result.reason);
  }

  private rejectClientIntent(client: Client, intent: Intent, decisionId: string | undefined, reason: string): void {
    // A refusal is the offending client's alone, so it travels in its own batch rather
    // than in the (empty) batch of the intent it refused.
    this.withBatch(
      () =>
        client.send(
          EVENT_CHANNEL,
          this.stamp({
            kind: "actionRejected",
            intent: intent.type,
            reason,
            ...(decisionId ? { decisionId } : {}),
          }),
        ),
      client,
    );
  }

  private sendCommandReceipt(
    client: Client | undefined,
    input: { commandId: string; sequence: number; status: "admitted" | "applied" | "rejected"; error?: string },
  ): void {
    client?.send(COMMAND_RECEIPT_CHANNEL, {
      ...input,
      ownerEpoch: this.handoffAuthority.ownerEpoch,
    });
  }

  private handleDurableCommand(client: Client, payload: unknown): void {
    const envelope = parseDurableCommand(payload);
    if (!envelope) {
      const commandId =
        typeof payload === "object" && payload !== null && "commandId" in payload
          ? String((payload as { commandId: unknown }).commandId)
          : "invalid";
      this.sendCommandReceipt(client, { commandId, sequence: 0, status: "rejected", error: "invalid_command" });
      return;
    }
    const queued = this.commandQueue.then(() => this.admitAndApplyDurableCommand(client, envelope));
    this.commandQueue = queued.then(
      () => undefined,
      () => undefined,
    );
    void queued.catch((error: unknown) => {
      this.commandQuarantined = true;
      this.handoffAuthority.freeze(this.handoffAuthority.ownerEpoch);
      this.debugError("[AegisRoom] durable command failed closed", error);
      this.sendCommandReceipt(client, {
        commandId: envelope.commandId,
        sequence: envelope.sequence,
        status: "rejected",
        error: "command_recovery_required",
      });
    });
  }

  private async admitAndApplyDurableCommand(client: Client, envelope: DurableCommandEnvelope): Promise<void> {
    const seat = this.seatByClient.get(client.sessionId);
    const participantId = this.accountByClient.get(client.sessionId);
    const store = this.handoffStoreInstance;
    if (!store || seat === undefined || !participantId || this.commandQuarantined) {
      this.sendCommandReceipt(client, {
        commandId: envelope.commandId,
        sequence: envelope.sequence,
        status: "rejected",
        error: store ? "room_command_recovery_required" : "room_command_feature_disabled",
      });
      return;
    }
    await this.ensureLogicalSession();
    const sessionId = this.handoffSessionId;
    if (!sessionId || envelope.gameId !== sessionId) {
      this.sendCommandReceipt(client, {
        commandId: envelope.commandId,
        sequence: envelope.sequence,
        status: "rejected",
        error: "room_session_unavailable",
      });
      return;
    }

    const existing = await store.getCommand(sessionId, envelope.commandId);
    if (existing) {
      if (
        existing.participantId !== participantId ||
        existing.seat !== seat ||
        existing.participantSequence !== envelope.sequence ||
        stableJson(existing.payload) !== stableJson({ intent: { ...envelope.payload, type: envelope.kind } })
      ) {
        this.sendCommandReceipt(client, {
          commandId: envelope.commandId,
          sequence: envelope.sequence,
          status: "rejected",
          error: "command_id_conflict",
        });
        return;
      }
      if (existing.status !== "admitted") {
        this.sendStoredCommandReceipt(client, existing);
        return;
      }
      this.sendCommandReceipt(client, {
        commandId: envelope.commandId,
        sequence: envelope.sequence,
        status: "admitted",
      });
      await this.applyAdmittedCommand(existing, envelope.ownerEpoch, client, false);
      return;
    }

    if (
      envelope.ownerEpoch !== this.handoffAuthority.ownerEpoch ||
      !this.handoffAuthority.acceptsAuthority(envelope.ownerEpoch) ||
      !(await this.hasCurrentDurableAuthority(envelope.ownerEpoch))
    ) {
      this.sendCommandReceipt(client, {
        commandId: envelope.commandId,
        sequence: envelope.sequence,
        status: "rejected",
        error: "owner_epoch_mismatch",
      });
      return;
    }
    if (!this.isDurableCommandBoundary()) {
      this.sendCommandReceipt(client, {
        commandId: envelope.commandId,
        sequence: envelope.sequence,
        status: "rejected",
        error: "unsupported_execution_boundary",
      });
      return;
    }
    const session = await store.getSession(sessionId);
    if (!session || !(await this.persistCommandCheckpoint(session, session.lastCompletedCommandSequence))) {
      this.sendCommandReceipt(client, {
        commandId: envelope.commandId,
        sequence: envelope.sequence,
        status: "rejected",
        error: "checkpoint_unavailable",
      });
      return;
    }
    const admitted = await store.admitCommand({
      sessionId,
      commandId: envelope.commandId,
      participantId,
      seat,
      participantSequence: envelope.sequence,
      ownerEpoch: envelope.ownerEpoch,
      expectedRevision: null,
      payload: { intent: { ...envelope.payload, type: envelope.kind } },
      now: Date.now(),
    });
    if (!admitted.ok) {
      this.sendCommandReceipt(client, {
        commandId: envelope.commandId,
        sequence: envelope.sequence,
        status: "rejected",
        error: admitted.reason,
      });
      return;
    }
    if (admitted.value.status !== "admitted") {
      this.sendStoredCommandReceipt(client, admitted.value);
      return;
    }
    this.sendCommandReceipt(client, { commandId: envelope.commandId, sequence: envelope.sequence, status: "admitted" });
    await this.applyAdmittedCommand(admitted.value, envelope.ownerEpoch, client, false);
  }

  private sendStoredCommandReceipt(client: Client, command: RoomCommandRecord): void {
    const result = command.result as Record<string, unknown> | null;
    this.sendCommandReceipt(client, {
      commandId: command.commandId,
      sequence: command.participantSequence,
      status: command.status,
      ...(command.status === "rejected"
        ? { error: typeof result?.error === "string" ? result.error : "command_rejected" }
        : {}),
    });
  }

  private async recoverAdmittedCommand(ownerEpoch: number): Promise<boolean> {
    const store = this.handoffStoreInstance;
    const sessionId = this.handoffSessionId;
    if (!store || !sessionId) return false;
    const pending = await store.getNextAdmittedCommand(sessionId);
    if (!pending) return true;
    return this.applyAdmittedCommand(pending, ownerEpoch, undefined, true);
  }

  private async applyAdmittedCommand(
    command: RoomCommandRecord,
    ownerEpoch: number,
    client: Client | undefined,
    recovering: boolean,
  ): Promise<boolean> {
    const store = this.handoffStoreInstance;
    const sessionId = this.handoffSessionId;
    if (!store || !sessionId || command.sessionId !== sessionId) return false;
    const next = await store.getNextAdmittedCommand(sessionId);
    if (!next || next.commandId !== command.commandId) {
      if (client)
        this.sendCommandReceipt(client, {
          commandId: command.commandId,
          sequence: command.participantSequence,
          status: "rejected",
          error: "command_sequence_gap",
        });
      return false;
    }
    const session = await store.getSession(sessionId);
    const ownerCurrent = !!(
      session &&
      session.status === "active" &&
      session.ownerEpoch === ownerEpoch &&
      session.owner.roomId === this.roomId &&
      (recovering
        ? session.activeTransferId === this.handoffTransferId
        : session.activeTransferId === null && this.handoffAuthority.acceptsAuthority(ownerEpoch))
    );
    if (!ownerCurrent || (!recovering && !(await this.hasCurrentDurableAuthority(ownerEpoch)))) return false;
    if (!this.isDurableCommandBoundary()) return false;
    const stored = command.payload as { intent?: unknown };
    const intentValue = stored?.intent;
    if (typeof intentValue !== "object" || intentValue === null || Array.isArray(intentValue)) return false;
    const intent = intentValue as Intent;
    if (!DURABLE_COMMAND_TYPES.has(intent.type)) return false;
    const currentSequence = session!.lastCompletedCommandSequence;
    if (command.commandSequence !== currentSequence + 1) return false;

    let result: ReturnType<AegisRoom["applyLoggedIntent"]>;
    try {
      result = this.applyLoggedIntent(command.seat, intent);
      if (result.ok) await this.engine.mainVerbChain;
    } catch (error) {
      this.debugError("[AegisRoom] admitted command application failed", error);
      this.quarantineCommandOwner(ownerEpoch);
      if (client)
        this.sendCommandReceipt(client, {
          commandId: command.commandId,
          sequence: command.participantSequence,
          status: "rejected",
          error: "command_recovery_required",
        });
      return false;
    }

    let checkpoint: ReturnType<AegisRoom["commandCheckpoint"]> | undefined;
    if (result.ok) {
      if (!this.isDurableCommandBoundary()) {
        this.quarantineCommandOwner(ownerEpoch);
        if (client)
          this.sendCommandReceipt(client, {
            commandId: command.commandId,
            sequence: command.participantSequence,
            status: "rejected",
            error: "command_recovery_required",
          });
        return false;
      }
      try {
        checkpoint = this.commandCheckpoint();
      } catch {
        this.quarantineCommandOwner(ownerEpoch);
        return false;
      }
    }
    const terminalStatus: "applied" | "rejected" = result.ok ? "applied" : "rejected";
    let terminalResult: JsonValue;
    if (result.ok) terminalResult = { ok: true };
    else terminalResult = { ok: false, error: result.reason };
    const completed = await store.completeCommand({
      sessionId,
      commandId: command.commandId,
      ownerEpoch,
      status: terminalStatus,
      result: terminalResult,
      now: Date.now(),
      ...(checkpoint ? { checkpoint } : {}),
    });
    if (!completed.ok) {
      this.quarantineCommandOwner(ownerEpoch);
      if (client)
        this.sendCommandReceipt(client, {
          commandId: command.commandId,
          sequence: command.participantSequence,
          status: "rejected",
          error: "command_recovery_required",
        });
      return false;
    }
    if (result.ok) this.unsequencedHandoffIntentCount = Math.max(0, this.unsequencedHandoffIntentCount - 1);
    if (client) this.sendStoredCommandReceipt(client, completed.value);
    return true;
  }

  private quarantineCommandOwner(ownerEpoch: number): void {
    this.commandQuarantined = true;
    this.handoffAuthority.freeze(ownerEpoch);
  }

  private isDurableCommandBoundary(): boolean {
    return (
      this.state.phase === Phase.Main &&
      !this.state.gameOver &&
      this.state.pendingDecision === undefined &&
      this.state.combatWindow === undefined &&
      this.currentBatch === undefined &&
      this.batchDepth === 0 &&
      this.engine.mainVerbContinuationsInFlight === 0 &&
      !this.engine.counterResolutionInFlight &&
      this.engine.optionResolutionDepth === 0 &&
      this.engine.effectResolutionDepth === 0 &&
      !this.engine.mainEntryPending
    );
  }

  private commandCheckpoint(): NonNullable<Parameters<RoomHandoffStore["completeCommand"]>[0]["checkpoint"]> {
    const boundary = exportStoppedMainBoundary(this.state);
    const snapshot = {
      ...boundary,
      runtime: {
        protocol: ROOM_RUNTIME_PROTOCOL,
        version: 1,
        transferId: COMMAND_CHECKPOINT_TRANSFER_ID,
        pausedAtMs: 0,
        engine: this.engine.exportContinuityState(),
        botRoster: null,
      } satisfies RoomRuntimeContinuityFrame,
    };
    return {
      checkpointId: randomUUID(),
      snapshotSchemaVersion: ROOM_HANDOFF_SNAPSHOT_VERSION,
      executionVersion: process.env.AEGIS_HANDOFF_EXECUTION_VERSION ?? "engine-v1",
      rulesVersion: process.env.AEGIS_HANDOFF_RULES_VERSION ?? "rules-v1",
      sourceRevision: process.env.AEGIS_SOURCE_REVISION ?? "development",
      checksum: checkpointDigest(snapshot),
      snapshot: snapshot as unknown as JsonValue,
    };
  }

  private async persistCommandCheckpoint(session: RoomSessionRecord, commandSequence: number): Promise<boolean> {
    const store = this.handoffStoreInstance;
    if (!store || !this.handoffSessionId || !this.isDurableCommandBoundary() || this.unsequencedHandoffIntentCount > 0)
      return false;
    const existing = await store.getCheckpoint(this.handoffSessionId);
    if (existing?.commandSequence === commandSequence) return true;
    let checkpoint: ReturnType<AegisRoom["commandCheckpoint"]>;
    try {
      checkpoint = this.commandCheckpoint();
    } catch {
      return false;
    }
    const saved = await store.saveCheckpoint({
      sessionId: this.handoffSessionId,
      ownerEpoch: session.ownerEpoch,
      ...checkpoint,
      now: Date.now(),
      commandSequence,
    });
    return saved.ok;
  }

  /**
   * The revision the board will be at when the decision is asked. A decision is raised
   * inside the batch that produced it and `stateVersion` is bumped when that batch closes,
   * so an open broadcast batch means the answer belongs to the next revision.
   */
  private decisionStateVersion(): number {
    const open = this.currentBatch;
    return this.state.stateVersion + (open && !open.recipient ? 1 : 0);
  }

  private requestDecision(seat: Seat, req: DecisionRequest): void {
    this.debug("decision.requested", { seat, request: req });
    this.pendingDecisionRequest = req;
    const bot = this.bots[seat];
    if (bot !== undefined) {
      this.debug(`[AegisRoom] requestDecision seat=${seat} kind=${req.kind} → bot`);
      bot.onDecisionRequested(req);
      return;
    }
    const client = this.clients.find((c) => this.seatByClient.get(c.sessionId) === seat);
    const handSize = this.state.players[seat]?.hand?.length ?? "?";
    if (!client) {
      this.debug(
        `[AegisRoom] requestDecision seat=${seat} kind=${req.kind} id=${req.decisionId} → NOT FOUND. clients=[${this.clients.map((c) => `${c.sessionId}(→seat${this.seatByClient.get(c.sessionId) ?? "?"})`).join(", ")}] seatByClientKeys=[${[...this.seatByClient.entries()].map(([sid, s]) => `${sid}→${s}`).join(", ")}]`,
      );
    } else {
      this.debug(
        `[AegisRoom] requestDecision seat=${seat} kind=${req.kind} id=${req.decisionId} → client ${client.sessionId} (handSize=${handSize})`,
      );
    }
    // Publish the matching pendingDecision before its richer unicast request.
    // Otherwise an older scheduled state patch can arrive after DECISION_CHANNEL,
    // and useRoom correctly treats that stale `pendingDecision = undefined` as the
    // decision having closed, making a real modal disappear before it can be used.
    this.broadcastPatch();
    // The engine awaits the matching "respondDecision" intent (correlated by decisionId).
    client?.send(DECISION_CHANNEL, { ...req, stateVersion: this.decisionStateVersion() });
  }
}
