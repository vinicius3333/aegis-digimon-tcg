import {
  type DecisionRequest,
  type DecisionResponse,
  type GameState,
  type Seat,
  PendingDecision,
} from "@aegis/shared";

/**
 * Pending player-decision queue: the coroutine replacement (ARCHITECTURE.md
 * section 5; subsystem: intent-protocol-and-room).
 *
 * Server-authoritative port of the source "ask the player, then block until they
 * answer" pattern. In the documented rules an effect coroutine raises a prompt and then
 * `yield return new WaitUntil(() => player.HasPlayerSelection())`; an incoming
 * network transport RPC (`OptionalSkill.SetUseOptional`, `MultipleSkills.SetTargetSkill`)
 * calls `player.QueuePlayerSelection(...)`, and the coroutine resumes by dequeuing
 * it (documented behavior 134-145; documented behavior 425-436).
 *
 * Here there is no UI to block on, so:
 *   - `request(...)` allocates a decisionId, mirrors it into `state.pendingDecision`
 *     (so the wire contract's "only respondDecision is accepted while a decision is
 *     open" gate works), sends the DecisionRequest to the deciding seat, and returns
 *     a Promise that the awaiting effect code holds.
 *   - `respond(...)` is called by the engine when a `respondDecision` intent arrives;
 *     it validates the seat + decisionId, clears `pendingDecision`, and resolves the
 *     promise — the effect resumes exactly where it paused.
 *   - a per-decision timer auto-resolves a stalled decision with a safe default
 *     (decline / empty selection) so one client cannot freeze the match
 *     (API-CONTRACT.md section 7).
 *
 * Only one decision is open at a time (the documented rules resolves effects strictly one-by-one;
 * `MultipleSkills` never has two outstanding `WaitUntil`s). `request` therefore
 * rejects if called while another decision is pending — a programming error in the
 * resolver, surfaced loudly rather than silently dropped.
 */

/** A single in-flight decision awaiting its seat's response. */
interface OpenDecision {
  decisionId: string;
  seat: Seat;
  kind: DecisionRequest["kind"];
  /** `min`/`candidateInstanceIds` offered, if any — see {@link satisfiesMin}. */
  min: number | undefined;
  candidateInstanceIds: readonly string[] | undefined;
  distinctCardIds: boolean;
  cardIdByInstance: ReadonlyMap<string, string>;
  /** Trigger identities offered by an `orderTriggers` decision. */
  triggerKeys: readonly string[] | undefined;
  resolve: (response: DecisionResponse) => void;
  timer: ReturnType<typeof setTimeout> | undefined;
}

/** Capabilities the manager needs from the room transport (injected by GameEngine). */
export interface DecisionTransport {
  /** Deliver a DecisionRequest to the deciding seat (room unicasts it). */
  requestDecision(seat: Seat, req: DecisionRequest): void;
}

/** Options bounding decision lifetime. */
export interface DecisionManagerOptions {
  /**
   * Auto-resolve a stalled decision after this many ms with a safe default
   * (API-CONTRACT.md section 7). 0 / undefined disables the timer (tests resolve
   * synchronously). Defaults to {@link DEFAULT_DECISION_TIMEOUT_MS} in a server.
   */
  timeoutMs?: number;
}

/** Default turn timer for an open decision (server). */
export const DEFAULT_DECISION_TIMEOUT_MS = 60_000;

/** What the engine passes to open a decision. */
export interface DecisionSpec {
  seat: Seat;
  kind: DecisionRequest["kind"];
  promptText: string;
  options?: DecisionRequest["options"];
  sourceCardId?: string;
}

export class DecisionManager {
  private open: OpenDecision | undefined;
  private seq = 0;

  constructor(
    private readonly state: GameState,
    private readonly transport: DecisionTransport,
    private readonly options: DecisionManagerOptions = {},
  ) {}

  /** Is a decision currently awaiting a response? Mirrors `state.pendingDecision !== undefined`. */
  get hasPending(): boolean {
    return this.open !== undefined;
  }

  /** The seat that must answer the open decision, if any. */
  get pendingSeat(): Seat | undefined {
    return this.open?.seat;
  }

  /**
   * Raise a decision to `spec.seat` and await its response. Resolves when the
   * matching `respondDecision` arrives (via {@link respond}) or, after the timeout,
   * with a safe default for the decision kind.
   */
  request(spec: DecisionSpec): Promise<DecisionResponse> {
    if (this.open !== undefined) {
      const err = new Error(
        `DecisionManager.request called while decision "${this.open.decisionId}" is still open. ` +
          "Effects must resolve one decision at a time (see historical migration ledger).",
      );
      console.error("[DecisionManager] nested request trace:", err.stack);
      throw err;
    }

    this.seq += 1;
    const decisionId = `dec-${this.seq}`;

    const req: DecisionRequest = {
      decisionId,
      seat: spec.seat,
      kind: spec.kind,
      promptText: spec.promptText,
      ...(spec.options !== undefined ? { options: spec.options } : {}),
      ...(spec.sourceCardId !== undefined ? { sourceCardId: spec.sourceCardId } : {}),
    };

    // Mirror into synchronized state so the intent-validation gate ("only
    // respondDecision while a decision is open") and the client UI both see it.
    const pending = new PendingDecision();
    pending.decisionId = decisionId;
    pending.seat = spec.seat;
    pending.kind = spec.kind;
    pending.promptText = spec.promptText;
    pending.payloadJson = spec.options !== undefined ? JSON.stringify(spec.options) : "";
    this.state.pendingDecision = pending;

    return new Promise<DecisionResponse>((resolve) => {
      const timeoutMs = this.options.timeoutMs ?? 0;
      const timer =
        timeoutMs > 0
          ? setTimeout(() => this.resolveOpen(decisionId, safeDefault(spec.kind)), timeoutMs)
          : undefined;

      this.open = {
        decisionId,
        seat: spec.seat,
        kind: spec.kind,
        min: spec.options?.min,
        candidateInstanceIds: spec.options?.candidateInstanceIds,
        distinctCardIds: spec.options?.distinctCardIds === true,
        cardIdByInstance: new Map(
          (spec.options?.visibleCards ?? []).map((card) => [card.instanceId, card.cardId]),
        ),
        triggerKeys: spec.options?.triggerKeys,
        resolve,
        timer,
      };
      this.transport.requestDecision(spec.seat, req);
    });
  }

  /**
   * Apply a respondDecision intent. Returns true when it matched the open decision
   * (correct seat, correct decisionId, response kind consistent with the request)
   * and was accepted; false otherwise so the engine can reject the intent without
   * touching state. Mirrors the source guard in the RPC handlers that ignores a
   * selection for the wrong player (documented behavior).
   */
  respond(seat: Seat, decisionId: string, response: DecisionResponse): boolean {
    const open = this.open;
    if (open === undefined) return false;
    if (open.seat !== seat) return false;
    if (open.decisionId !== decisionId) return false;
    if (!responseMatchesKind(open.kind, response)) return false;
    if (!satisfiesMin(open, response)) return false;
    if (!satisfiesDistinctCardIds(open, response)) return false;
    if (!choosesExactlyOneTrigger(open, response)) return false;
    if (!ordersEveryCard(open, response)) return false;

    this.resolveOpen(decisionId, response);
    return true;
  }

  /**
   * Abandon any open decision (match ended / seat left). Resolves the awaiting
   * promise with a safe default so the paused resolver unwinds instead of leaking.
   */
  cancel(): void {
    if (this.open !== undefined) {
      this.resolveOpen(this.open.decisionId, safeDefault(this.open.kind));
    }
  }

  private resolveOpen(decisionId: string, response: DecisionResponse): void {
    const open = this.open;
    if (open === undefined || open.decisionId !== decisionId) return;
    if (open.timer !== undefined) clearTimeout(open.timer);
    this.open = undefined;
    this.state.pendingDecision = undefined;
    open.resolve(response);
  }
}

/** Reject forged selections containing two instances of the same printed card number. */
function satisfiesDistinctCardIds(open: OpenDecision, response: DecisionResponse): boolean {
  if (!open.distinctCardIds || response.kind !== "selectCards") return true;
  const allowed = new Set(open.candidateInstanceIds ?? []);
  const seen = new Set<string>();
  for (const instanceId of new Set(response.instanceIds)) {
    if (!allowed.has(instanceId)) continue;
    const cardId = open.cardIdByInstance.get(instanceId);
    if (cardId === undefined || seen.has(cardId)) return false;
    seen.add(cardId);
  }
  return true;
}

function ordersEveryCard(open: OpenDecision, response: DecisionResponse): boolean {
  if (response.kind !== "orderCards") return true;
  const candidates = open.candidateInstanceIds ?? [];
  return response.order.length === candidates.length &&
    new Set(response.order).size === candidates.length &&
    response.order.every((id) => candidates.includes(id));
}

/**
 * `orderTriggers` is a choose-the-next-effect decision, not a bulk ordering.
 * Client responses must confirm exactly one currently offered trigger. Timeout and
 * cancellation defaults bypass `respond` and may still resolve with an empty order,
 * which lets the resolver apply its deterministic mandatory/optional fallback.
 */
function choosesExactlyOneTrigger(open: OpenDecision, response: DecisionResponse): boolean {
  if (response.kind !== "orderTriggers") return true;
  if (response.order.length !== 1) return false;
  return open.triggerKeys?.includes(response.order[0]!) === true;
}

/**
 * A response is only accepted for a decision whose kind it answers. `mulligan`
 * requests are answered by their own dedicated intent (not respondDecision), so
 * they never match here. `optional` is answered by an `optional` response; the
 * selection kinds (`chooseTargets`/`selectCards`/`orderTriggers`/`chooseOption`)
 * by their like-named responses.
 */
function responseMatchesKind(
  kind: DecisionRequest["kind"],
  response: DecisionResponse,
): boolean {
  switch (kind) {
    case "optional":
      return response.kind === "optional";
    case "chooseTargets":
      return response.kind === "chooseTargets";
    case "selectCards":
      return response.kind === "selectCards";
    case "orderCards":
      return response.kind === "orderCards";
    case "orderTriggers":
      return response.kind === "orderTriggers";
    case "chooseOption":
      return response.kind === "chooseOption";
    case "mulligan":
      // Answered by a dedicated intent, not respondDecision.
      return false;
    default: {
      const _exhaustive: never = kind;
      void _exhaustive;
      return false;
    }
  }
}

/**
 * Enforce the request's `min` lower bound on a `chooseTargets`/`selectCards`
 * response. `clampSelection` (decisionApi.ts) already re-derives the allowlist
 * and `max` server-side; `min` never reached that enforcement point, so a
 * client could answer a mandatory selection (e.g. "trash 2 of your cards")
 * with `[]` and the engine would treat it as a legitimate empty choice.
 *
 * The Comprehensive Rules resolve the general case (§15-10-2-1: "X number of
 * cards or as many cards up to X as possible must be chosen") and the
 * fundamental-principles fallback (§1-3-2: "the player performs as many of
 * the required actions as possible") — a mandatory selection is capped by how
 * many candidates actually exist, not refusable by choice. So the bound
 * enforced here is `min(open.min, candidateCount)`: a genuine shortage (fewer
 * candidates than `min`) is satisfied by picking all of them, while a client
 * that could have met `min` but didn't is rejected — the response is refused
 * (decision stays open) rather than silently accepted or auto-completed on
 * the player's behalf, matching how every other malformed-response case in
 * `respond` is handled (the existing per-decision timer is the stall backstop,
 * API-CONTRACT.md section 7).
 */
function satisfiesMin(open: OpenDecision, response: DecisionResponse): boolean {
  if (open.min === undefined) return true;
  const ids =
    response.kind === "chooseTargets" || response.kind === "selectCards"
      ? response.instanceIds
      : undefined;
  if (ids === undefined) return true;

  const candidates = open.candidateInstanceIds ?? [];
  const requiredMin = Math.min(open.min, candidates.length);
  if (requiredMin <= 0) return true;

  const allowed = new Set(candidates);
  const validCount = new Set(ids.filter((id) => allowed.has(id))).size;
  return validCount >= requiredMin;
}

/**
 * The safe default applied when a decision times out (or is cancelled). Declines
 * optional effects and selects nothing — the least-impactful choice, matching the
 * "decline optional / skip" rule (API-CONTRACT.md section 7).
 */
function safeDefault(kind: DecisionRequest["kind"]): DecisionResponse {
  switch (kind) {
    case "optional":
      return { kind: "optional", accept: false };
    case "chooseTargets":
      return { kind: "chooseTargets", instanceIds: [] };
    case "selectCards":
      return { kind: "selectCards", instanceIds: [] };
    case "orderCards":
      return { kind: "orderCards", order: [] };
    case "orderTriggers":
      return { kind: "orderTriggers", order: [] };
    case "chooseOption":
      return { kind: "chooseOption", optionIndex: 0 };
    case "mulligan":
      // Not driven through this manager; default to a benign optional decline so the
      // promise (if ever created for this) still settles.
      return { kind: "optional", accept: false };
    default: {
      const _exhaustive: never = kind;
      void _exhaustive;
      return { kind: "optional", accept: false };
    }
  }
}
