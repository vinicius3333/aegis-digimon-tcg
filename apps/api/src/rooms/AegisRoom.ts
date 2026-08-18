import { Room, Client, type Delayed } from "colyseus";
import { randomBytes } from "node:crypto";
import {
  GameState,
  type Intent,
  type DecisionRequest,
  type Seat,
  EVENT_CHANNEL,
  DECISION_CHANNEL,
} from "@aegis/shared";
import { GameEngine, type GameEngineOptions, type SeatJoinOptions } from "../engine/GameEngine.js";
import { BotPlayer, type BotOptions } from "../bot/BotPlayer.js";
import { randomBotDeck } from "../engine/testDecks.js";
import { accountStore } from "../accounts/runtime.js";
import type { AccountStore, DeckSnapshot } from "../accounts/AccountStore.js";
import { seriesStore } from "../tournaments/runtime.js";
import type { SeriesStore } from "../tournaments/series/index.js";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

function generateRoomCode(length = 6): string {
  const bytes = randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_CHARS[bytes[i]! % CODE_CHARS.length]!;
  }
  return code;
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

/** Maps private room codes to Colyseus room IDs for lookup. */
export const roomCodeRegistry = new Map<string, string>();

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
  private tournamentSeatHolders: ({ accountId: string } | { participantId: string } | undefined)[] = [undefined, undefined];
  private isBotRoom = false;
  private readonly BOT_SEAT = 1 as Seat;
  private isPrivate = false;
  private isRankedRoom = false;
  private isTournamentRoom = false;
  private tournamentMatchId: string | undefined;
  private tournamentGameId: string | undefined;
  private readyTimeout: Delayed | undefined;
  private matchStartRequested = false;

  /** Production rooms use the public pool; isolated scenario rooms may widen it. */
  protected cardPoolCutoffDate(): GameEngineOptions["cardPoolCutoffDate"] {
    return undefined;
  }

  /** Seam: the tournament series module this room reports to. Tests substitute their own. */
  protected series(): SeriesStore {
    return seriesStore;
  }

  /** Seam: the account store this room reads identity and legacy bracket state from. */
  protected accounts(): AccountStore {
    return accountStore;
  }

  // How long the in-memory match is held open for a client that dropped without
  // a consented leave (network blip, tab reload, mobile browser backgrounded —
  // phones kill the socket seconds after the app loses focus). A reconnect within
  // this window resumes the same seat; past it the drop resolves as a real
  // departure. Sized so switching apps to answer a message does not forfeit the
  // match. This cannot survive a server restart (deploy) — the room state lives
  // only in memory.
  private readonly RECONNECT_GRACE_SECONDS = 180;

  // How long both seats can sit joined-but-not-ready (e.g. a client stuck loading
  // assets, or one that crashed before it could send `ready`) before the room gives
  // up waiting and starts anyway, so the match never hangs indefinitely.
  private readonly READY_TIMEOUT_SECONDS = 60;

  override async onAuth(
    client: Client,
    options: AegisJoinOptions,
  ): Promise<boolean> {
    if (this.matchStartRequested || this.seatByClient.size >= this.maxClients) return false;
    const identity = await this.resolveIdentity(options);
    if (!identity) return false;
    const account = identity.account;
    if (account) options.displayName = account.displayName;
    const normalizedName = options.displayName.trim().toLocaleLowerCase();
    if (!normalizedName || this.state.players.some((player) => player?.displayName.trim().toLocaleLowerCase() === normalizedName)) return false;
    if ((options.ranked === true) !== this.isRankedRoom || ((this.isRankedRoom || this.isTournamentRoom) && !account)) return false;
    if ((this.isRankedRoom || this.isTournamentRoom) && account && [...this.accountByClient.values()].includes(account.id)) return false;
    // The host of a private room is always allowed; anybody after them needs the code.
    if (this.isPrivate && this.clients.length > 0 && options.roomCode !== this.state.roomCode) return false;
    // Every cheap check has passed, so it is finally safe to take the exclusive claims. Claiming
    // before a rejection would pin a bracket match or a Tournament Game to a room nobody ever
    // enters, and neither can be re-bound afterwards: the match would wedge (onDispose only
    // releases what was committed) and the game's UNIQUE room_id would refuse every later room.
    if (!await identity.commit()) return false;
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
      if (!this.isTournamentRoom || this.tournamentMatchId || options.tournamentMatchId || options.authTicket) return undefined;
      if (this.tournamentGameId && this.tournamentGameId !== gameId) return undefined;
      const entry = await this.series().inspectAuthorization({ gameId, authorizationToken: token, roomId: this.roomId });
      if (!entry.ok) return undefined;
      const { accountId, displayName, deck } = entry.value;
      // A bot's authorization is never valid over the wire. It has no Account, it is only ever
      // issued server-side to the code that drives the bot seat, and a client presenting one would
      // be redeeming a seat that is not a person's to take.
      if (!accountId) return undefined;
      // The frozen competitive deck is the only deck a tournament game is played with. Whatever the
      // client sent is discarded here, before onJoin can hand it to the engine.
      options.deck = { mainDeck: [...deck.mainDeck], eggDeck: [...deck.eggDeck] };
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
          if (!await this.accounts().claimTournamentRoom(matchId, this.roomId)) return false;
          this.tournamentMatchId = matchId;
          return true;
        },
      };
    }
    return {
      account: ticket?.account,
      commit: async () => { if (ticket?.tournamentMatchId) this.tournamentMatchId = ticket.tournamentMatchId; return true; },
    };
  }

  override onCreate(options: { seed?: number; private?: boolean; botRoom?: boolean; rankedRoom?: boolean; tournamentRoom?: boolean }): void {
    this.setState(new GameState());
    this.isBotRoom = options.botRoom === true;
    if (this.isBotRoom) {
      this.maxClients = 1;
      this.autoDispose = true;
    }
    this.isRankedRoom = options.rankedRoom === true;
    this.isTournamentRoom = options.tournamentRoom === true;
    if (options.private) {
      this.isPrivate = true;
      const code = generateRoomCode();
      this.state.roomCode = code;
      roomCodeRegistry.set(code, this.roomId);
      this.autoDispose = true;
    }
    this.engine = new GameEngine(this.state, {
      seed: options.seed ?? (Date.now() >>> 0),
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
          void this.lock().catch((error: unknown) => console.error("[AegisRoom] failed to lock finished room", error));
          void this.recordAuthoritativeResult(event).catch((error) => console.error("[AegisRoom] failed to persist match result", error));
        }
        this.broadcast(EVENT_CHANNEL, event);
        // Rebuild each client's StateView after any event that can move a CardInstance
        // into a public zone (battleArea/breeding topCard) from a private one
        // (hand/eggDeck). @colyseus/schema snapshots node visibility when the view is
        // built, so a card redacted while private stays redacted after it goes public
        // unless the view is rebuilt — otherwise the opponent reads topCard=undefined.
        if (
          event.kind === "cardPlayed" ||
          event.kind === "cardsMoved" ||
          event.kind === "digivolved"
        ) {
          this.rebuildClientViews();
        }
        // After dealing opening hands, force a state patch so clients receive
        // their cards before the mulligan decision arrives. Without this, the
        // decision message (sent synchronously) races ahead of the next scheduled
        // Colyseus patch and the client renders the mulligan overlay with 0 cards.
        if (event.kind === "matchStarted") {
          // Rebuild each human client's StateView now that the hands are dealt.
          // view.add() records which card ChangeTree nodes are visible at call time;
          // cards pushed after the initial view.add() in onJoin are not automatically
          // visible. Rebuilding here, after runSetup() populates the hands, ensures
          // every dealt card is in the view's visible set before broadcastPatch().
          this.rebuildClientViews();
          console.log("[AegisRoom] matchStarted — rebuilt views. Hand sizes:", this.state.players.map((p, i) => `seat${i}=${p?.hand?.length ?? "?"}`).join(", "));
          this.broadcastPatch();
          console.log("[AegisRoom] broadcastPatch() returned");
        }
        for (const bot of this.bots) bot?.onEvent(event);
      },
    }, {
      cardPoolCutoffDate: this.cardPoolCutoffDate(),
    });

    // One catch-all handler: every client intent type is reassembled into a
    // discriminated-union Intent and handed to the engine, which validates,
    // mutates state, and emits events. Rejections are surfaced as an
    // "actionRejected" event to the offending client only.
    this.onMessage("*", (client, type, payload) =>
      this.handleIntent(client, { type, ...(payload as object) } as Intent),
    );

    roomRegistry.set(this.roomId, this);
  }

  /**
   * Publishes what this room is authoritative about: the outcome of the ONE game it ran.
   *
   * For a Tournament Game that is the whole story — the series module decides whether another game
   * opens, whether the confrontation is over and what a timeout means. The room does not know
   * whether this was game 2 of a best-of-three, and must not learn.
   */
  private async recordAuthoritativeResult(event: Extract<import("@aegis/shared").ServerEvent, { kind: "gameOver" }>): Promise<void> {
    // The Tournament Game path comes first and does not require two Accounts: a seat driven by a
    // bot has no client, so `accountByClient` holds nothing for it and the two-account guard below
    // would silently discard a perfectly good result.
    if (this.tournamentGameId) {
      const outcome = event.result.outcome === "draw" ? ({ kind: "draw" } as const) : this.winnerOutcome(event.result.winnerSeat);
      if (!outcome) {
        console.error(`[AegisRoom] tournament game result UNATTRIBUTABLE gameId=${this.tournamentGameId} roomId=${this.roomId} winnerSeat=${event.result.outcome === "draw" ? "-" : event.result.winnerSeat}`);
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
      if (!recorded.ok) console.error(`[AegisRoom] tournament game result REJECTED gameId=${this.tournamentGameId} roomId=${this.roomId} reason=${recorded.reason}`);
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
    if (this.isTournamentRoom && this.tournamentMatchId) { const snapshots = decks[0] && decks[1] ? [decks[0], decks[1]] as [DeckSnapshot, DeckSnapshot] : undefined; if (event.result.outcome === "draw") { await this.accounts().recordTournamentRoomDraw(this.tournamentMatchId, this.roomId, [accounts[0], accounts[1]], event.reason, snapshots); return; } const winner = event.result.winnerSeat; await this.accounts().recordTournamentRoomResult(this.tournamentMatchId, this.roomId, [accounts[0], accounts[1]], accounts[winner], event.reason, snapshots); return; }
    if (!ranked) return;
    if (event.result.outcome === "draw") { await this.accounts().recordMatch({ roomId: this.roomId, mode: "ranked", playerAccountIds: [accounts[0], accounts[1]], reason: event.reason, deckSnapshots: decks[0] && decks[1] ? [decks[0], decks[1]] : undefined }); return; }
    const winner = event.result.winnerSeat;
    await this.accounts().recordMatch({ roomId: this.roomId, mode: "ranked", playerAccountIds: [accounts[0], accounts[1]], winnerAccountId: accounts[winner], reason: event.reason, deckSnapshots: decks[0] && decks[1] ? [decks[0], decks[1]] : undefined });
  }

  /**
   * Names the winning seat the way the series module can accept it: by Account when a person won,
   * by participant when a bot did.
   *
   * A seated client is preferred over the recorded holder, so the ordinary human path is unchanged.
   * `undefined` means the seat belongs to nobody the room knows about, which is never expected and
   * must not be reported as somebody else's win.
   */
  private winnerOutcome(winnerSeat: Seat): { kind: "winner"; winnerAccountId: string } | { kind: "winnerParticipant"; winnerParticipantId: string } | undefined {
    const player = this.state.players[winnerSeat];
    const accountId = player ? this.accountByClient.get(player.sessionId) : undefined;
    if (accountId) return { kind: "winner", winnerAccountId: accountId };
    const holder = this.tournamentSeatHolders[winnerSeat];
    if (holder && "accountId" in holder) return { kind: "winner", winnerAccountId: holder.accountId };
    if (holder && "participantId" in holder) return { kind: "winnerParticipant", winnerParticipantId: holder.participantId };
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
  async seatTournamentBot(input: { gameId: string; authorizationToken: string; botOptions?: BotOptions }): Promise<boolean> {
    if (!this.isTournamentRoom || this.matchStartRequested) return false;
    if (this.tournamentGameId && this.tournamentGameId !== input.gameId) return false;
    if (this.seatByClient.size + this.occupiedBotSeats().length >= 2) return false;

    // Only a bot participant may be driven from here — a human's authorization redeemed this way
    // would seat an unattended bot in a person's seat. Checked BEFORE anything is consumed:
    // `inspectAuthorization` validates without binding a room or spending the token, so a human's
    // token presented here is refused and stays usable by the person it belongs to.
    const inspected = await this.series().inspectAuthorization({ gameId: input.gameId, authorizationToken: input.authorizationToken, roomId: this.roomId });
    if (!inspected.ok || inspected.value.kind !== "bot" || !inspected.value.participantId) return false;

    const claimed = await this.series().claimGame({ gameId: input.gameId, authorizationToken: input.authorizationToken, roomId: this.roomId });
    if (!claimed.ok) return false;
    const { participantId, kind, displayName, deck } = claimed.value;
    if (kind !== "bot" || !participantId) return false;
    this.tournamentGameId = input.gameId;

    const taken = new Set<Seat>([...this.seatByClient.values(), ...this.occupiedBotSeats()]);
    const seat: Seat = taken.has(0 as Seat) ? (1 as Seat) : (0 as Seat);
    if (taken.has(seat)) return false;

    this.tournamentSeatHolders[seat] = { participantId };
    this.bots[seat] = new BotPlayer(seat, this.state, (intent) => {
      const result = this.engine.applyIntent(seat, intent);
      this.rebuildClientViews();
      return result;
    }, input.botOptions);
    this.engine.seatPlayer(seat, `bot:${participantId}`, { displayName, deck: { mainDeck: [...deck.mainDeck], eggDeck: [...deck.eggDeck] } });
    // The bot announces readiness through the ordinary intent, so the ready gate closes for the
    // usual reason rather than being bypassed. Against a person that means the match starts when
    // THEY are ready (with the existing timeout as the fallback), instead of dealing them a hand
    // while their client is still loading; between two bots it means the second seat's readiness
    // starts the match, with nobody waiting on anybody.
    this.engine.applyIntent(seat, { type: "ready" });
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
    this.readyTimeout = this.clock.setTimeout(() => this.startMatchNow(), this.READY_TIMEOUT_SECONDS * 1000);
  }

  override onDispose(): void {
    this.readyTimeout?.clear();
    // Legacy only. A Tournament Game's room binding is permanent by design: the game either
    // finished here or is voided by the scheduler, and re-binding it to a second room would be the
    // duplicate-claim the UNIQUE room_id exists to prevent.
    if (!this.tournamentGameId && this.tournamentMatchId) void this.accounts().releaseTournamentRoom(this.tournamentMatchId, this.roomId).catch((error) => console.error("[AegisRoom] failed to release tournament room", error));
    roomRegistry.delete(this.roomId);
    if (this.state.roomCode) {
      roomCodeRegistry.delete(this.state.roomCode);
    }
  }

  override onJoin(client: Client, options: AegisJoinOptions): void {
    this.rankedByClient.set(client.sessionId, options.ranked === true);
    this.deckByClient.set(client.sessionId, { deckId: options.deckId ?? null, deckName: options.deckName ?? "Deck sem nome", mainDeck: [...options.deck.mainDeck], eggDeck: [...options.deck.eggDeck] });
    // Assign the first free seat instead of using clients.length - 1, which
    // breaks when a client disconnects and reconnects (e.g. React StrictMode
    // double-mounts, or genuine network reconnect).
    // Bot seats count as taken: a tournament bot may already be driving seat 0.
    const taken = new Set<Seat>([...this.seatByClient.values(), ...this.occupiedBotSeats()]);
    let seat: Seat = taken.has(0) ? 1 : 0;

    // A real reconnection is handled by allowReconnection() in onLeave. If a
    // staged PlayerState remains in a now-free seat, this is a replacement
    // player and their own identity/deck must replace the departed player's.
    const existing = this.state.players[seat];
    if (existing && existing.sessionId !== client.sessionId) {
      console.log(`[AegisRoom] onJoin sessionId=${client.sessionId} seat=${seat} → replacing departed player ${existing.sessionId}`);
      this.seatByClient.set(client.sessionId, seat);
      this.engine.seatPlayer(seat, client.sessionId, options);
      client.view = this.engine.makeStateView(seat);
    } else {
      console.log(`[AegisRoom] onJoin sessionId=${client.sessionId} seat=${seat} takenSeats=[${[...taken].join(",")}] totalClients=${this.clients.length} allSessionIds=[${this.clients.map(c => c.sessionId).join(", ")}]`);
      this.seatByClient.set(client.sessionId, seat);
      this.engine.seatPlayer(seat, client.sessionId, options);
      // Per-client visibility: hide hidden zones from the other seat.
      client.view = this.engine.makeStateView(seat);
    }
    const accountId = this.accountByClient.get(client.sessionId);
    if (this.tournamentGameId && accountId) this.tournamentSeatHolders[seat] = { accountId };
    // The match starts once both seats have sent `ready` (GameEngineHooks.onBothReady),
    // not on join — starting on join races the client's asset loading against the
    // mulligan window. Arm a fallback so a stuck/never-readying client can't hang the
    // room forever.
    this.armReadyTimeoutIfSeated();
  }

  /** Idempotent: only the first caller (ready-gate or timeout) actually starts the match. */
  private startMatchNow(): void {
    if (this.matchStartRequested) return;
    this.matchStartRequested = true;
    this.readyTimeout?.clear();
    this.readyTimeout = undefined;
    // Advertise that the game is genuinely under way, so a scheduler can tell a room that never
    // started apart from one that started and stopped reporting.
    if (this.tournamentGameId) void this.series().markGamePlaying(this.tournamentGameId, this.roomId).catch((error: unknown) => console.error("[AegisRoom] failed to mark tournament game playing", error));
    this.engine.startMatch();
  }

  override async onLeave(client: Client, consented: boolean): Promise<void> {
    const seat = this.seatByClient.get(client.sessionId);
    const accountId = this.accountByClient.get(client.sessionId);
    const countsAsDodge = this.isRankedRoom && this.matchStartRequested && !this.state.gameOver && accountId !== undefined;
    console.log(`[AegisRoom] onLeave sessionId=${client.sessionId} seat=${seat} consented=${consented} totalClients=${this.clients.length}`);
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
      }
      this.seatByClient.delete(client.sessionId);
      this.engine.clearReady(seat);
      this.engine.handleDisconnect(seat, true);
      if (countsAsDodge && accountId) await this.accounts().recordRankedDodge(this.roomId, accountId);
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
    this.engine.handleDisconnect(seat, false);
    try {
      await this.allowReconnection(client, this.RECONNECT_GRACE_SECONDS);
      console.log(`[AegisRoom] reconnected sessionId=${client.sessionId} seat=${seat}`);
      this.engine.handleReconnect(seat);
      if (!this.matchStartRequested) {
        await this.unlock();
        if (this.clients.length === 2) this.readyTimeout = this.clock.setTimeout(() => this.startMatchNow(), this.READY_TIMEOUT_SECONDS * 1000);
      }
      client.view = this.engine.makeStateView(seat);
      // Re-send any pending decision so the resumed client can continue.
      const pending = this.state.pendingDecision;
      if (pending && pending.seat === seat) client.send(DECISION_CHANNEL, pending);
    } catch {
      // Grace elapsed (or room disposed) without a reconnect: resolve as a real
      // departure — the opponent wins an in-progress match.
      console.log(`[AegisRoom] reconnect grace elapsed sessionId=${client.sessionId} seat=${seat}`);
      this.seatByClient.delete(client.sessionId);
      this.readyTimeout?.clear();
      this.readyTimeout = undefined;
      this.engine.clearReady(seat);
      this.engine.handleDisconnect(seat, true);
      if (countsAsDodge && accountId) await this.accounts().recordRankedDodge(this.roomId, accountId);
      this.accountByClient.delete(client.sessionId);
      this.rankedByClient.delete(client.sessionId);
      if (!this.matchStartRequested) await this.unlock();
    }
  }

  /**
   * Seat a bot as seat 1 and start the match. The room must have exactly one
   * human player already seated. Idempotent: a second call is a no-op.
   */
  addBot(): boolean {
    // Ordinary casual rooms remain accepted during the expand/contract rollout so
    // a tab with the previous web bundle can still start its bot match. New clients
    // create an isolated bot room and therefore never enter the casual queue.
    // Tournament rooms stay refused here, and that refusal is what `POST /bot/join` inherits. A
    // tournament bot is seated only through seatTournamentBot(), against an authorization no HTTP
    // caller can obtain.
    if (this.isRankedRoom || this.isTournamentRoom || this.isPrivate || this.bots[this.BOT_SEAT] !== undefined || this.clients.length !== 1) return false;

    this.bots[this.BOT_SEAT] = new BotPlayer(this.BOT_SEAT, this.state, (intent) => {
      const result = this.engine.applyIntent(this.BOT_SEAT, intent);
      // After each bot action, rebuild every human client's StateView so that
      // CardInstances moved from the bot's private hand into public positions
      // (battleArea, breeding) are recognised as newly-visible by @colyseus/schema
      // and included in the next patch with their full state.
      this.rebuildClientViews();
      return result;
    });

    this.engine.seatPlayer(this.BOT_SEAT, "bot", {
      displayName: "Bot",
      deck: randomBotDeck(),
    });

    // The bot never sends its own `ready` intent (it isn't a Colyseus client, so it
    // has no seatByClient entry for applyIntent to route through) — starting the
    // match directly here is the bot seat's stand-in for readiness.
    this.startMatchNow();
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
   * Refresh the public per-zone count mirrors before every state broadcast. The
   * hidden zones (deck/hand/security) are redacted per seat, so only these counts
   * convey their sizes to the opponent; recomputing here keeps them in lockstep with
   * the arrays after any mutation an intent caused (API-CONTRACT "Visibility";
   * ARCHITECTURE.md section 6). Colyseus calls this once per patch.
   */
  override onBeforePatch(): void {
    this.engine.syncCounts();
  }

  private handleIntent(client: Client, intent: Intent): void {
    const seat = this.seatByClient.get(client.sessionId);
    if (seat === undefined) return;
    const result = this.engine.applyIntent(seat, intent);
    if (!result.ok) {
      client.send(EVENT_CHANNEL, {
        kind: "actionRejected",
        intent: intent.type,
        reason: result.reason,
      });
    }
  }

  private requestDecision(seat: Seat, req: DecisionRequest): void {
    const bot = this.bots[seat];
    if (bot !== undefined) {
      console.log(`[AegisRoom] requestDecision seat=${seat} kind=${req.kind} → bot`);
      bot.onDecisionRequested(req);
      return;
    }
    const client = this.clients.find(
      (c) => this.seatByClient.get(c.sessionId) === seat,
    );
    const handSize = this.state.players[seat]?.hand?.length ?? "?";
    if (!client) {
      console.log(`[AegisRoom] requestDecision seat=${seat} kind=${req.kind} id=${req.decisionId} → NOT FOUND. clients=[${this.clients.map(c => `${c.sessionId}(→seat${this.seatByClient.get(c.sessionId) ?? "?"})`).join(", ")}] seatByClientKeys=[${[...this.seatByClient.entries()].map(([sid, s]) => `${sid}→${s}`).join(", ")}]`);
    } else {
      console.log(`[AegisRoom] requestDecision seat=${seat} kind=${req.kind} id=${req.decisionId} → client ${client.sessionId} (handSize=${handSize})`);
    }
    // Publish the matching pendingDecision before its richer unicast request.
    // Otherwise an older scheduled state patch can arrive after DECISION_CHANNEL,
    // and useRoom correctly treats that stale `pendingDecision = undefined` as the
    // decision having closed, making a real modal disappear before it can be used.
    this.broadcastPatch();
    // The engine awaits the matching "respondDecision" intent (correlated by decisionId).
    client?.send(DECISION_CHANNEL, req);
  }
}
