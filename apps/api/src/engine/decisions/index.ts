import {
  type DecisionRequest,
  type DecisionResponse,
  type GameState,
  type Seat,
  PendingDecision,
  effectiveExactNames,
  getCardDefinition,
} from "@aegis/shared";
import { decisionCardIdentities } from "./visibleIdentities.js";

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
  distinctNames: boolean;
  cardIdByInstance: ReadonlyMap<string, string>;
  /** Trigger identities offered by an `orderTriggers` decision. */
  triggerKeys: readonly string[] | undefined;
  executionFrame: DecisionExecutionFrame | undefined;
  expiresAt: number | undefined;
  resolve: ((response: DecisionResponse) => void) | undefined;
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
  /** Handoff experiments are opt-in and may never be enabled by a production process. */
  executionFramesEnabled?: boolean;
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
  sourceInstanceId?: string;
  sourcePermanentId?: string;
  /** Stable continuation data for the small number of waits that can be resumed after handoff. */
  executionContinuation?: DecisionExecutionContinuation;
}

export type DecisionJsonValue =
  | null
  | boolean
  | number
  | string
  | readonly DecisionJsonValue[]
  | { readonly [key: string]: DecisionJsonValue };

/** Stable, JSON-only identifier and data needed to continue one supported wait on a new process. */
export interface DecisionExecutionContinuation {
  readonly kind: string;
  readonly version: number;
  readonly data: { readonly [key: string]: DecisionJsonValue };
}

/** Serializable description of a pending decision and the execution frame waiting on it. */
export interface DecisionExecutionFrame {
  readonly protocol: "aegis-decision-execution-frame";
  readonly version: 1;
  readonly request: DecisionRequest;
  readonly validation: {
    readonly min: number | null;
    readonly candidateInstanceIds: readonly string[] | null;
    readonly distinctCardIds: boolean;
    readonly distinctNames: boolean;
    readonly cardIdByInstance: readonly (readonly [string, string])[];
    readonly triggerKeys: readonly string[] | null;
  };
  readonly continuation: DecisionExecutionContinuation;
  /** Milliseconds left on the source decision timer, or null when timers are disabled. */
  readonly timeoutRemainingMs: number | null;
}

export interface DecisionExecutionFrameResult {
  readonly decisionId: string;
  readonly continuationKind: string;
  readonly value: DecisionJsonValue;
}

/** Pure response-to-next-step mapping; it must return JSON data and never mutate game state. */
type DecisionExecutionFrameResumer = (frame: DecisionExecutionFrame, response: DecisionResponse) => DecisionJsonValue;

export class DecisionManager {
  private open: OpenDecision | undefined;
  private seq = 0;
  private readonly executionFrameResumers = new Map<string, DecisionExecutionFrameResumer>();
  private readonly resumedExecutionFrames = new Map<string, DecisionExecutionFrameResult>();

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

  /** Register compiled continuation code by its stable frame kind and version. */
  registerExecutionFrameResumer(kind: string, version: number, resumer: DecisionExecutionFrameResumer): void {
    const key = executionFrameResumerKey(kind, version);
    const registered = this.executionFrameResumers.get(key);
    if (registered !== undefined && registered !== resumer) {
      throw new Error(`decision execution frame resumer already registered: ${key}`);
    }
    this.executionFrameResumers.set(key, resumer);
  }

  /** Export the currently open supported decision as plain data, never its resolver closure. */
  exportExecutionFrame(): DecisionExecutionFrame {
    const frame = this.open?.executionFrame;
    if (frame === undefined) {
      throw new Error("the open decision has no serializable execution continuation");
    }
    return {
      ...frame,
      timeoutRemainingMs: this.open?.expiresAt === undefined ? null : Math.max(0, this.open.expiresAt - Date.now()),
      request: {
        ...frame.request,
        ...(frame.request.options !== undefined ? { options: structuredClone(frame.request.options) } : {}),
      },
      validation: {
        ...frame.validation,
        candidateInstanceIds:
          frame.validation.candidateInstanceIds === null ? null : [...frame.validation.candidateInstanceIds],
        cardIdByInstance: frame.validation.cardIdByInstance.map(([instanceId, cardId]) => [instanceId, cardId]),
        triggerKeys: frame.validation.triggerKeys === null ? null : [...frame.validation.triggerKeys],
      },
      continuation: structuredClone(frame.continuation),
    };
  }

  /** Restore a pending decision without reconstructing its source Promise or resolver closure. */
  restoreExecutionFrame(frame: DecisionExecutionFrame): void {
    if (!this.executionFramesEnabled) throw new Error("decision execution frames are disabled");
    assertDecisionExecutionFrame(frame);
    if (this.open !== undefined) throw new Error("cannot restore over an open decision");
    const resumerKey = executionFrameResumerKey(frame.continuation.kind, frame.continuation.version);
    const resumer = this.executionFrameResumers.get(resumerKey);
    if (resumer === undefined) {
      throw new Error(`unsupported decision execution continuation: ${resumerKey}`);
    }
    try {
      // Resumers are pure continuation mappings. Preflight here so corrupt/unsupported
      // frame data cannot consume the player's answer or leave a restored prompt stranded.
      const preflightResult = resumer(frame, safeDefault(frame.request.kind));
      if (!isJsonValue(preflightResult)) throw new Error("non-serializable continuation result");
    } catch {
      throw new Error(`invalid decision execution continuation frame: ${resumerKey}`);
    }

    const request = structuredClone(frame.request);
    const payloadJson = request.options === undefined ? "" : JSON.stringify(request.options);
    const currentPending = this.state.pendingDecision;
    if (
      currentPending !== undefined &&
      (currentPending.decisionId !== request.decisionId ||
        currentPending.seat !== request.seat ||
        currentPending.kind !== request.kind ||
        currentPending.promptText !== request.promptText ||
        currentPending.payloadJson !== payloadJson)
    ) {
      throw new Error("decision execution frame does not match restored game state");
    }
    if (currentPending === undefined) {
      const pending = new PendingDecision();
      pending.decisionId = request.decisionId;
      pending.seat = request.seat;
      pending.kind = request.kind;
      pending.promptText = request.promptText;
      pending.payloadJson = payloadJson;
      this.state.pendingDecision = pending;
    }

    const timeoutRemainingMs = frame.timeoutRemainingMs;
    const expiresAt = timeoutRemainingMs === null ? undefined : Date.now() + timeoutRemainingMs;
    const timer =
      timeoutRemainingMs === null
        ? undefined
        : setTimeout(() => this.resolveOpen(request.decisionId, safeDefault(request.kind)), timeoutRemainingMs);
    this.open = {
      decisionId: request.decisionId,
      seat: request.seat,
      kind: request.kind,
      min: frame.validation.min ?? undefined,
      candidateInstanceIds: frame.validation.candidateInstanceIds ?? undefined,
      distinctCardIds: frame.validation.distinctCardIds,
      distinctNames: frame.validation.distinctNames,
      cardIdByInstance: new Map(frame.validation.cardIdByInstance),
      triggerKeys: frame.validation.triggerKeys ?? undefined,
      executionFrame: structuredClone(frame),
      expiresAt,
      resolve: undefined,
      timer,
    };
    const sequence = /^dec-(\d+)$/.exec(request.decisionId)?.[1];
    if (sequence !== undefined) this.seq = Math.max(this.seq, Number(sequence));

    if (timeoutRemainingMs === 0) {
      queueMicrotask(() => this.resolveOpen(request.decisionId, safeDefault(request.kind)));
    }
  }

  private get executionFramesEnabled(): boolean {
    return this.options.executionFramesEnabled === true && process.env.NODE_ENV !== "production";
  }

  /** Read a completed serializable continuation after its response was accepted. */
  takeResumedExecutionFrameResult(decisionId: string): DecisionExecutionFrameResult | undefined {
    const result = this.resumedExecutionFrames.get(decisionId);
    this.resumedExecutionFrames.delete(decisionId);
    return result;
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

    const options = withCardIdentities(this.state, spec.seat, spec.options);
    const req: DecisionRequest = {
      decisionId,
      seat: spec.seat,
      kind: spec.kind,
      promptText: spec.promptText,
      ...(options !== undefined ? { options } : {}),
      ...(spec.sourceCardId !== undefined ? { sourceCardId: spec.sourceCardId } : {}),
      ...(spec.sourceInstanceId !== undefined ? { sourceInstanceId: spec.sourceInstanceId } : {}),
      ...(spec.sourcePermanentId !== undefined ? { sourcePermanentId: spec.sourcePermanentId } : {}),
    };

    const executionContinuationKey =
      this.executionFramesEnabled && spec.executionContinuation !== undefined
        ? executionFrameResumerKey(spec.executionContinuation.kind, spec.executionContinuation.version)
        : undefined;
    if (executionContinuationKey !== undefined && !this.executionFrameResumers.has(executionContinuationKey)) {
      throw new Error(`unsupported decision execution continuation: ${executionContinuationKey}`);
    }

    // Mirror into synchronized state so the intent-validation gate ("only
    // respondDecision while a decision is open") and the client UI both see it.
    const pending = new PendingDecision();
    pending.decisionId = decisionId;
    pending.seat = spec.seat;
    pending.kind = spec.kind;
    pending.promptText = spec.promptText;
    pending.payloadJson = options !== undefined ? JSON.stringify(options) : "";
    this.state.pendingDecision = pending;

    return new Promise<DecisionResponse>((resolve) => {
      const timeoutMs = this.options.timeoutMs ?? 0;
      const expiresAt = timeoutMs > 0 ? Date.now() + timeoutMs : undefined;
      const timer =
        timeoutMs > 0 ? setTimeout(() => this.resolveOpen(decisionId, safeDefault(spec.kind)), timeoutMs) : undefined;

      const open: OpenDecision = {
        decisionId,
        seat: spec.seat,
        kind: spec.kind,
        min: spec.options?.min,
        candidateInstanceIds: spec.options?.candidateInstanceIds,
        distinctCardIds: spec.options?.distinctCardIds === true,
        distinctNames: spec.options?.distinctNames === true,
        cardIdByInstance: new Map([
          // The deciding player's hand is already visible to them, so enrichment may omit
          // it from visibleCards. Validation still needs its authoritative identities.
          ...(this.state.players[spec.seat]?.hand ?? []).map((card): [string, string] => [
            card.instanceId,
            card.cardId,
          ]),
          ...(options?.visibleCards ?? []).map((card): [string, string] => [card.instanceId, card.cardId]),
        ]),
        triggerKeys: spec.options?.triggerKeys,
        executionFrame: undefined,
        expiresAt,
        resolve,
        timer,
      };
      if (executionContinuationKey !== undefined && spec.executionContinuation !== undefined) {
        open.executionFrame = {
          protocol: "aegis-decision-execution-frame",
          version: 1,
          request: structuredClone(req),
          validation: {
            min: open.min ?? null,
            candidateInstanceIds: open.candidateInstanceIds === undefined ? null : [...open.candidateInstanceIds],
            distinctCardIds: open.distinctCardIds,
            distinctNames: open.distinctNames,
            cardIdByInstance: [...open.cardIdByInstance.entries()].map(([instanceId, cardId]) => [instanceId, cardId]),
            triggerKeys: open.triggerKeys === undefined ? null : [...open.triggerKeys],
          },
          continuation: structuredClone(spec.executionContinuation),
          timeoutRemainingMs: timeoutMs > 0 ? timeoutMs : null,
        };
      }
      this.open = open;
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
    if (!satisfiesDistinctNames(open, response)) return false;
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
    let frameResult: DecisionExecutionFrameResult | undefined;
    if (open.executionFrame !== undefined) {
      const key = executionFrameResumerKey(
        open.executionFrame.continuation.kind,
        open.executionFrame.continuation.version,
      );
      const resumer = this.executionFrameResumers.get(key);
      if (resumer === undefined) throw new Error(`unsupported decision execution continuation: ${key}`);
      const value = resumer(open.executionFrame, response);
      if (!isJsonValue(value)) throw new Error(`non-serializable decision continuation result: ${key}`);
      frameResult = {
        decisionId,
        continuationKind: key,
        value,
      };
    }
    if (open.timer !== undefined) clearTimeout(open.timer);
    this.open = undefined;
    this.state.pendingDecision = undefined;
    if (frameResult !== undefined) this.resumedExecutionFrames.set(decisionId, frameResult);
    open.resolve?.(response);
  }
}

function executionFrameResumerKey(kind: string, version: number): string {
  return `${kind}@${version}`;
}

function assertDecisionExecutionFrame(value: unknown): asserts value is DecisionExecutionFrame {
  if (typeof value !== "object" || value === null) throw new Error("invalid decision execution frame");
  const frame = value as Partial<DecisionExecutionFrame>;
  const request = frame.request;
  const validation = frame.validation;
  const continuation = frame.continuation;
  const decisionKinds: readonly string[] = [
    "optional",
    "chooseTargets",
    "selectCards",
    "orderCards",
    "orderTriggers",
    "chooseOption",
    "mulligan",
  ];
  if (
    frame.protocol !== "aegis-decision-execution-frame" ||
    frame.version !== 1 ||
    typeof request !== "object" ||
    request === null ||
    typeof request.decisionId !== "string" ||
    (request.seat !== 0 && request.seat !== 1) ||
    typeof request.kind !== "string" ||
    !decisionKinds.includes(request.kind) ||
    typeof request.promptText !== "string" ||
    typeof validation !== "object" ||
    validation === null ||
    (validation.min !== null &&
      (typeof validation.min !== "number" || !Number.isFinite(validation.min) || validation.min < 0)) ||
    (validation.candidateInstanceIds !== null &&
      (!Array.isArray(validation.candidateInstanceIds) ||
        !validation.candidateInstanceIds.every((id) => typeof id === "string"))) ||
    typeof validation.distinctCardIds !== "boolean" ||
    typeof validation.distinctNames !== "boolean" ||
    !Array.isArray(validation.cardIdByInstance) ||
    (frame.timeoutRemainingMs !== null &&
      (typeof frame.timeoutRemainingMs !== "number" ||
        !Number.isFinite(frame.timeoutRemainingMs) ||
        frame.timeoutRemainingMs < 0)) ||
    typeof continuation !== "object" ||
    continuation === null ||
    typeof continuation.kind !== "string" ||
    continuation.kind === "" ||
    typeof continuation.version !== "number" ||
    !Number.isSafeInteger(continuation.version) ||
    continuation.version < 1 ||
    typeof continuation.data !== "object" ||
    continuation.data === null ||
    Array.isArray(continuation.data) ||
    !isJsonValue(continuation.data)
  ) {
    throw new Error("invalid decision execution frame");
  }
  for (const pair of validation.cardIdByInstance) {
    if (!Array.isArray(pair) || pair.length !== 2 || typeof pair[0] !== "string" || typeof pair[1] !== "string") {
      throw new Error("invalid decision execution frame validation data");
    }
  }
  if (
    validation.triggerKeys !== null &&
    (!Array.isArray(validation.triggerKeys) || !validation.triggerKeys.every((key) => typeof key === "string"))
  ) {
    throw new Error("invalid decision execution frame validation data");
  }
}

function isJsonValue(value: unknown): value is DecisionJsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return (prototype === Object.prototype || prototype === null) && Object.values(value).every(isJsonValue);
}

/** Reject duplicate card names before resolving the prompt, preserving the chance to retry. */
function satisfiesDistinctNames(open: OpenDecision, response: DecisionResponse): boolean {
  if (!open.distinctNames || response.kind !== "selectCards") return true;
  const seen = new Set<string>();
  for (const instanceId of response.instanceIds) {
    if (!open.candidateInstanceIds?.includes(instanceId)) return false;
    const cardId = open.cardIdByInstance.get(instanceId);
    const definition = cardId === undefined ? undefined : getCardDefinition(cardId);
    if (definition === undefined) return false;
    const names = effectiveExactNames(definition).map((name) => name.toLowerCase());
    if (names.some((name) => seen.has(name))) return false;
    for (const name of names) seen.add(name);
  }
  return true;
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
  return (
    response.order.length === candidates.length &&
    new Set(response.order).size === candidates.length &&
    response.order.every((id) => candidates.includes(id))
  );
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
function responseMatchesKind(kind: DecisionRequest["kind"], response: DecisionResponse): boolean {
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
  const ids = response.kind === "chooseTargets" || response.kind === "selectCards" ? response.instanceIds : undefined;
  if (ids === undefined) return true;

  const candidates = open.candidateInstanceIds ?? [];
  const requiredMin = Math.min(open.min, candidates.length);
  if (requiredMin <= 0) return true;

  const allowed = new Set(candidates);
  const validCount = new Set(ids.filter((id) => allowed.has(id))).size;
  return validCount >= requiredMin;
}

/**
 * The decision's options with every card the deciding seat cannot otherwise name added to
 * `visibleCards`. A card module that supplied its own entry keeps it — this only fills the
 * gaps, so the identities the client draws from stay the ones the engine published. See
 * {@link decisionCardIdentities} for which cards qualify and why the rest must not.
 */
function withCardIdentities(state: GameState, seat: Seat, options: DecisionSpec["options"]): DecisionSpec["options"] {
  if (options === undefined) return options;
  const offered = [
    ...(options.candidateInstanceIds ?? []),
    ...(options.visibleInstanceIds ?? []),
    ...(options.visibleCards ?? []).map((card) => card.instanceId),
  ];
  if (offered.length === 0) return options;
  const identities = decisionCardIdentities(state, seat, offered);
  const identitiesById = new Map(identities.map((card) => [card.instanceId, card]));
  const existing = (options.visibleCards ?? []).map((card) => {
    const known = identitiesById.get(card.instanceId);
    return !card.artId && known?.cardId === card.cardId && known.artId ? { ...card, artId: known.artId } : card;
  });
  const alreadyNamed = new Set(existing.map((card) => card.instanceId));
  const filled = identities.filter((card) => !alreadyNamed.has(card.instanceId));
  return { ...options, visibleCards: [...existing, ...filled] };
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
