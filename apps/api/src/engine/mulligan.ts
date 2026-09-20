import { PendingDecision, type DecisionRequest, type GameState, type Seat } from "@aegis/shared";

/**
 * The opening-hand mulligan window (subsystem: deck-and-setup; source: Comprehensive
 * Rules §5-2-1-4/5 "re-draw"). After opening hands are dealt, each player — STARTING
 * WITH THE FIRST PLAYER — may declare a single redraw of their hand.
 *
 * Unlike the in-game decisions routed through DecisionManager, the mulligan is
 * answered by its own dedicated `mulligan` intent (API-CONTRACT §4; DecisionManager
 * deliberately does not match `mulligan`). This small coordinator owns that window:
 *   - {@link request} opens the window for one seat: it mirrors a `mulligan`
 *     PendingDecision into synchronized state (so the client sees the prompt and the
 *     "only respond while a decision is open" gate is consistent), sends the
 *     DecisionRequest to that seat, and returns a promise.
 *   - {@link answer} is called when that seat's `mulligan` intent arrives: it clears
 *     the pending state and resolves the promise with the keep/redraw choice.
 *
 * Only one mulligan is open at a time (the engine sequences the seats, first player
 * first). {@link cancel} unwinds an open window (match torn down mid-setup) so the
 * awaiting setup code does not leak.
 */
export interface MulliganTransport {
  requestDecision(seat: Seat, req: DecisionRequest): void;
}

export interface MulliganExecutionFrame {
  readonly protocol: "aegis-mulligan-execution-frame";
  readonly version: 1;
  readonly request: DecisionRequest;
  readonly continuation: {
    readonly kind: "mulligan.keep-choice";
    readonly version: 1;
    readonly data: Record<string, never>;
  };
}

export interface MulliganExecutionFrameResult {
  readonly decisionId: string;
  readonly continuationKind: "mulligan.keep-choice@1";
  readonly value: boolean;
}

/** The explicit match-lifecycle cursor waiting on one seat's mulligan response. */
export interface MulliganWindowExecutionFrame {
  readonly protocol: "aegis-mulligan-window-execution-frame";
  readonly version: 1;
  readonly firstSeat: Seat;
  readonly nextSeatIndex: 0 | 1;
  readonly decision: MulliganExecutionFrame;
}

interface MulliganCoordinatorOptions {
  /** Handoff experiments are opt-in and may never be enabled by a production process. */
  executionFramesEnabled?: boolean;
}

export class MulliganCoordinator {
  private open:
    | {
        seat: Seat;
        decisionId: string;
        frame: MulliganExecutionFrame | undefined;
        resolve: ((keep: boolean) => void) | undefined;
        completion: Promise<boolean>;
      }
    | undefined;
  private seq = 0;
  private readonly resumedFrames = new Map<string, MulliganExecutionFrameResult>();

  constructor(
    private readonly state: GameState,
    private readonly transport: MulliganTransport,
    private readonly options: MulliganCoordinatorOptions = {},
  ) {}

  /** Is a mulligan window currently open (awaiting a `mulligan` intent)? */
  get isOpen(): boolean {
    return this.open !== undefined;
  }

  /** The seat whose mulligan window is open, if any. */
  get pendingSeat(): Seat | undefined {
    return this.open?.seat;
  }

  get pendingRequest(): DecisionRequest | undefined {
    return this.open?.frame?.request;
  }

  /** Reconstructed completion promise for a restored wait owned by a new lifecycle runner. */
  waitForOpen(): Promise<boolean> {
    if (!this.open) throw new Error("there is no open mulligan to await");
    return this.open.completion;
  }

  /** Export the supported mulligan wait without its source Promise resolver. */
  exportExecutionFrame(): MulliganExecutionFrame {
    const frame = this.open?.frame;
    if (frame === undefined) throw new Error("the open mulligan has no serializable execution continuation");
    return JSON.parse(JSON.stringify(frame)) as MulliganExecutionFrame;
  }

  /** Restore the dedicated mulligan wait on a different coordinator/process. */
  restoreExecutionFrame(frame: MulliganExecutionFrame): void {
    if (!this.executionFramesEnabled) throw new Error("mulligan execution frames are disabled");
    assertMulliganExecutionFrame(frame);
    if (this.open !== undefined) throw new Error("cannot restore over an open mulligan");
    const request = frame.request;
    const currentPending = this.state.pendingDecision;
    if (
      currentPending !== undefined &&
      (currentPending.decisionId !== request.decisionId ||
        currentPending.seat !== request.seat ||
        currentPending.kind !== "mulligan" ||
        currentPending.promptText !== request.promptText ||
        currentPending.payloadJson !== "")
    ) {
      throw new Error("mulligan execution frame does not match restored game state");
    }
    if (currentPending === undefined) {
      const pending = new PendingDecision();
      pending.decisionId = request.decisionId;
      pending.seat = request.seat;
      pending.kind = "mulligan";
      pending.promptText = request.promptText;
      pending.payloadJson = "";
      this.state.pendingDecision = pending;
    }
    let resolve!: (keep: boolean) => void;
    const completion = new Promise<boolean>((accept) => {
      resolve = accept;
    });
    this.open = { seat: request.seat, decisionId: request.decisionId, frame, resolve, completion };
    const sequence = /^mull-(\d+)$/.exec(request.decisionId)?.[1];
    if (sequence !== undefined) this.seq = Math.max(this.seq, Number(sequence));
  }

  /** Read the completed stable mulligan continuation after answer/cancellation. */
  takeResumedExecutionFrameResult(decisionId: string): MulliganExecutionFrameResult | undefined {
    const result = this.resumedFrames.get(decisionId);
    this.resumedFrames.delete(decisionId);
    return result;
  }

  private get executionFramesEnabled(): boolean {
    return this.options.executionFramesEnabled === true && process.env.NODE_ENV !== "production";
  }

  /**
   * Open the mulligan window for `seat` and resolve when its `mulligan` intent
   * arrives. Resolves to `keep` (true = keep the hand, false = the player chose to
   * redraw). Throws if a window is already open (the engine must sequence seats).
   */
  request(seat: Seat): Promise<boolean> {
    if (this.open !== undefined) {
      throw new Error("MulliganCoordinator.request called while a mulligan window is open");
    }
    this.seq += 1;
    const decisionId = `mull-${this.seq}`;

    const req: DecisionRequest = {
      decisionId,
      seat,
      kind: "mulligan",
      promptText: "Redraw your opening hand?",
    };
    const frame = this.executionFramesEnabled
      ? {
          protocol: "aegis-mulligan-execution-frame" as const,
          version: 1 as const,
          request: { ...req },
          continuation: { kind: "mulligan.keep-choice" as const, version: 1 as const, data: {} },
        }
      : undefined;

    const pending = new PendingDecision();
    pending.decisionId = decisionId;
    pending.seat = seat;
    pending.kind = "mulligan";
    pending.promptText = req.promptText;
    pending.payloadJson = "";
    this.state.pendingDecision = pending;

    let resolve!: (keep: boolean) => void;
    const completion = new Promise<boolean>((accept) => {
      resolve = accept;
    });
    this.open = {
      seat,
      decisionId,
      frame,
      resolve,
      completion,
    };
    this.transport.requestDecision(seat, req);
    return completion;
  }

  /**
   * Apply a `mulligan` intent. Returns true when it matched the open window (correct
   * seat) and was accepted; false otherwise so the engine can reject the intent
   * without touching state.
   */
  answer(seat: Seat, keep: boolean): boolean {
    const open = this.open;
    if (open === undefined) return false;
    if (open.seat !== seat) return false;
    this.resolveOpen(keep);
    return true;
  }

  /** Abandon an open window (match ended / seat left): resolve as "keep" so setup unwinds. */
  cancel(): void {
    if (this.open !== undefined) this.resolveOpen(true);
  }

  private resolveOpen(keep: boolean): void {
    const open = this.open;
    if (open === undefined) return;
    const result = open.frame === undefined ? undefined : resumeMulliganFrame(open.frame, keep);
    this.open = undefined;
    this.state.pendingDecision = undefined;
    if (result !== undefined) {
      this.resumedFrames.set(open.decisionId, {
        decisionId: open.decisionId,
        continuationKind: "mulligan.keep-choice@1",
        value: result,
      });
    }
    open.resolve?.(keep);
  }
}

/** Apply the stable post-answer step represented by a mulligan frame. */
export function resumeMulliganFrame(frame: MulliganExecutionFrame, keep: boolean): boolean {
  assertMulliganExecutionFrame(frame);
  return keep;
}

function assertMulliganExecutionFrame(value: unknown): asserts value is MulliganExecutionFrame {
  if (typeof value !== "object" || value === null) throw new Error("invalid mulligan execution frame");
  const frame = value as Partial<MulliganExecutionFrame>;
  const request = frame.request;
  const continuation = frame.continuation;
  if (
    frame.protocol !== "aegis-mulligan-execution-frame" ||
    frame.version !== 1 ||
    typeof request !== "object" ||
    request === null ||
    request.kind !== "mulligan" ||
    typeof request.decisionId !== "string" ||
    !/^mull-\d+$/.test(request.decisionId) ||
    (request.seat !== 0 && request.seat !== 1) ||
    typeof request.promptText !== "string" ||
    typeof continuation !== "object" ||
    continuation === null ||
    continuation.kind !== "mulligan.keep-choice" ||
    continuation.version !== 1 ||
    typeof continuation.data !== "object" ||
    continuation.data === null ||
    Array.isArray(continuation.data) ||
    Object.keys(continuation.data).length !== 0
  ) {
    throw new Error("invalid mulligan execution frame");
  }
}
