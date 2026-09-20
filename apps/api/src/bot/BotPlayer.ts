import {
  Phase,
  CARD_ARRIVAL_NARRATION_MS,
  EFFECT_CHOICE_NARRATION_MS,
  PHASE_NARRATION_MS,
  TURN_NARRATION_MS,
  SECURITY_CHECK_NARRATION_MS,
  SECURITY_DESTRUCTION_NARRATION_MS,
  SECURITY_EFFECT_NARRATION_MS,
  Zone,
  type DecisionRequest,
  type GameState,
  type Intent,
  type IntentResult,
  type Seat,
  type ServerEvent,
} from "@aegis/shared";
import { createEvaluationPolicy, type BotPolicy } from "./policy.js";
import { DEFAULT_BOT_PROFILE, resolveBotProfile, type BotProfile, type BotProfileName } from "./profiles.js";
import { createBotRandom, createBotRandomFromState, type BotRandom } from "./rng.js";
import {
  activateDormantBotRoster,
  createDormantBotRoster,
  restoreDormantBotRoster,
  type DormantBotDescriptor,
  type DormantBotRosterFrame,
} from "../rooms/handoff/stage5Primitives.js";
import { buildBotView, type BotView } from "./view.js";

/* Default think-time window (ms). It is a window rather than a fixed beat so a
   run of actions does not tick out metronomically, and it is this long because
   the client narrates every bot action — the showcase, the burst and the feed
   entry all have to be readable before the next action displaces them. */
export const DEFAULT_MIN_ACTION_DELAY_MS = 2_000;
export const DEFAULT_MAX_ACTION_DELAY_MS = 2_800;

/* Combat windows are reflexes, not plans. The engine blocks the whole attack on the
   answer, and the attacking client holds its target arrow on the board until it lands,
   so a main-phase think time here reads as the game hanging between the arrow reaching
   security and the battle that follows. Long enough to look like a choice, short enough
   that nobody waits for it. */
export const COMBAT_REFLEX_MIN_MS = 300;
export const COMBAT_REFLEX_MAX_MS = 650;

/** Safety valve: the most actions the bot will take in one Main phase. */
const MAX_MAIN_PHASE_ACTIONS = 40;

export interface BotOptions {
  minThinkMs?: number;
  maxThinkMs?: number;
  /** Personality. Weights only — every profile runs the same evaluation. */
  profile?: BotProfileName | BotProfile;
  /** Seeded so an identical engine seed plus this seed replays identically. */
  seed?: number;
  /** Supply a different policy (the benchmark uses this to seat the baseline policy). */
  policy?: BotPolicy;
  /** Replaces the think delay. The headless benchmark passes a microtask yield. */
  thinkDelay?: () => Promise<void>;
  /** Explicit experimental capability; no production caller enables this yet. */
  handoffEnabled?: boolean;
  /** Internal state supplied only by `restoreDormant`. */
  handoffRestore?: { roster: DormantBotRosterFrame; descriptor: DormantBotDescriptor };
}

export type BotHandoffOwner = { gameId: string; ownerEpoch: number };

export type SuspendBotInput = {
  gameId: string;
  /** The epoch expected to own the destination copy. */
  ownerEpoch: number;
  participantId: string;
  connectedClientSeats: readonly Seat[];
};

/**
 * Bot seat driver: owns the asynchronous plumbing, owns none of the judgement.
 *
 * It runs in-process, calling `applyIntent` through the supplied callback — no network
 * hop, and it shares the engine's state reference with the room that hosts it. Every
 * "what should I do" question is delegated to a {@link BotPolicy}; this class only
 * decides WHEN to ask (phase transitions, decision requests, combat windows) and paces
 * the answers so play feels human: a think delay for its own actions, a reflex for the
 * combat windows the opponent is waiting on.
 *
 * The engine's combat windows (block / counter / alliance / evade / barrier) block on a
 * promise until the seat responds, so all five are answered here — a seat that answers
 * only the block window deadlocks the match the first time a Digimon with ＜Evade＞ loses
 * a battle.
 */
export class BotPlayer {
  private runningMainPhase = false;
  private resumeMainPhaseWhenIdle = false;
  private lastTurnStarted = -1;
  private breedingActionTurn = -1;
  /** The attack currently in its block window, so the block appraisal knows the target. */
  private pendingAttackTargetsPlayer = true;
  private readonly minThinkMs: number;
  private readonly maxThinkMs: number;
  private readonly policy: BotPolicy;
  /** Narration the opposing client still owes the last attack, in milliseconds. */
  private narrationUntil = 0;
  /**
   * A security check is open: the card is face up and the engine is holding the attack on
   * whatever it raises next. Opened by `securityRevealed`, closed by `securityChecked` —
   * the protocol promises exactly one of each, in that order.
   */
  private resolvingSecurityCheck = false;
  private readonly usesRealTimePacing: boolean;
  private readonly pause: (minMs: number, maxMs: number) => Promise<void>;
  private readonly handoffEnabled: boolean;
  private readonly policyCanHandoff: boolean;
  private readonly handoffProfile: BotProfileName | undefined;
  private readonly seed: number;
  private readonly driverRandom: BotRandom;
  private dormant = false;
  private pendingWaits = 0;
  private pendingContinuations = 0;
  private handoffRoster: DormantBotRosterFrame | undefined;

  constructor(
    private readonly seat: Seat,
    private readonly state: GameState,
    private readonly sendIntent: (intent: Intent) => IntentResult | void,
    options: BotOptions = {},
  ) {
    this.minThinkMs = options.minThinkMs ?? DEFAULT_MIN_ACTION_DELAY_MS;
    this.maxThinkMs = Math.max(options.maxThinkMs ?? DEFAULT_MAX_ACTION_DELAY_MS, this.minThinkMs);
    const restored = options.handoffRestore;
    this.seed = restored?.descriptor.seed ?? options.seed ?? 0x5eed;
    this.handoffEnabled = options.handoffEnabled === true;
    this.policyCanHandoff = restored !== undefined || options.policy === undefined;
    this.handoffProfile =
      restored?.descriptor.profile ??
      (options.profile === undefined
        ? DEFAULT_BOT_PROFILE.name
        : typeof options.profile === "string"
          ? options.profile
          : undefined);
    this.policy =
      options.policy ??
      createEvaluationPolicy({
        profile: resolveBotProfile(restored?.descriptor.profile ?? options.profile),
        seed: this.seed,
        ...(restored === undefined
          ? {}
          : {
              handoffState: {
                protocol: "aegis-evaluation-policy" as const,
                version: 1 as const,
                randomState: restored.descriptor.policyRngState,
                rejectedKeys: restored.descriptor.policyRejectedKeys ?? [],
                attemptedKeys: restored.descriptor.policyAttemptedKeys ?? [],
              },
            }),
      });
    this.driverRandom = restored
      ? createBotRandomFromState(restored.descriptor.rngState)
      : createBotRandom(this.seed ^ 0x9e37);
    this.dormant = restored !== undefined;
    this.handoffRoster = restored?.roster;
    if (restored) {
      this.lastTurnStarted = restored.descriptor.turnCount;
      this.breedingActionTurn = restored.descriptor.breedingActionTurn ?? -1;
      this.narrationUntil = Date.now() + (restored.descriptor.narrationRemainingMs ?? 0);
    }
    const injected = options.thinkDelay;
    this.usesRealTimePacing = injected === undefined;
    this.pause = injected
      ? () => injected()
      : (minMs, maxMs) =>
          new Promise<void>((resolve) =>
            setTimeout(resolve, minMs + Math.floor(this.driverRandom.next() * (maxMs - minMs + 1))),
          );
  }

  /**
   * Import a bot descriptor without starting it. The caller must prove the transferred game and
   * seat match the surrounding room snapshot; owner-epoch activation remains a separate step.
   */
  static restoreDormant(input: {
    roster: unknown;
    seat: Seat;
    state: GameState;
    sendIntent: (intent: Intent) => IntentResult | void;
    options?: Omit<BotOptions, "policy" | "profile" | "seed" | "handoffRestore">;
  }): BotPlayer {
    const roster = restoreDormantBotRoster(input.roster);
    const descriptor = roster.bots.find((bot) => bot.seat === input.seat);
    if (!descriptor) throw new Error(`dormant bot roster has no seat ${input.seat}`);
    if (descriptor.pendingThinkMs !== null)
      throw new Error("handoff does not support restoring an in-flight bot timer");
    return new BotPlayer(input.seat, input.state, input.sendIntent, {
      ...input.options,
      handoffEnabled: true,
      profile: descriptor.profile,
      seed: descriptor.seed,
      handoffRestore: { roster, descriptor },
    });
  }

  /** Stop this driver and export its deterministic state at a quiescent engine boundary. */
  suspendForHandoff(input: SuspendBotInput): DormantBotRosterFrame {
    if (!this.handoffEnabled) throw new Error("bot handoff capability is disabled");
    if (!this.handoffProfile) throw new Error("custom bot profiles are not serializable for handoff");
    if (!this.policyCanHandoff) throw new Error("custom bot policies are not restorable by this adapter");
    if (!this.policy.exportHandoffState) throw new Error("bot policy does not support handoff export");
    if (
      this.runningMainPhase ||
      this.pendingWaits > 0 ||
      this.pendingContinuations > 0 ||
      this.state.pendingDecision !== undefined ||
      this.state.combatWindow !== undefined
    ) {
      throw new Error("bot handoff requires a quiescent decision boundary");
    }
    const policy = this.policy.exportHandoffState();
    const roster = createDormantBotRoster({
      gameId: input.gameId,
      ownerEpoch: input.ownerEpoch,
      connectedClientSeats: input.connectedClientSeats,
      bots: [
        {
          seat: this.seat,
          participantId: input.participantId,
          profile: this.handoffProfile,
          seed: this.seed >>> 0,
          turnCount: this.state.turnCount,
          rngState: this.driverRandom.exportState(),
          policyRngState: policy.randomState,
          pendingThinkMs: null,
          policyRejectedKeys: policy.rejectedKeys,
          policyAttemptedKeys: policy.attemptedKeys,
          breedingActionTurn: this.breedingActionTurn,
          narrationRemainingMs: Math.max(0, this.narrationUntil - Date.now()),
        },
      ],
    });
    this.dormant = true;
    this.handoffRoster = roster;
    return roster;
  }

  /** Activate only after the destination room has committed the matching logical owner epoch. */
  activateAfterHandoff(owner: BotHandoffOwner): boolean {
    if (!this.handoffEnabled) throw new Error("bot handoff capability is disabled");
    if (!this.dormant || !this.handoffRoster) return false;
    this.handoffRoster = activateDormantBotRoster(this.handoffRoster, owner);
    this.dormant = false;
    this.resumeCurrentTurn();
    return true;
  }

  /** Resume the source only after the coordinator has durably marked its transfer aborted. */
  resumeAfterAbortedHandoff(input: BotHandoffOwner & { transferStatus: string }): boolean {
    if (!this.handoffEnabled) throw new Error("bot handoff capability is disabled");
    if (!this.dormant || !this.handoffRoster) return false;
    if (
      input.transferStatus !== "aborted" ||
      input.gameId !== this.handoffRoster.gameId ||
      input.ownerEpoch + 1 !== this.handoffRoster.ownerEpoch
    ) {
      throw new Error("aborted bot transfer does not match the source owner epoch");
    }
    this.handoffRoster = undefined;
    this.dormant = false;
    this.resumeCurrentTurn();
    return true;
  }

  private resumeCurrentTurn(): void {
    if (this.state.turnSeat === this.seat) {
      if (this.state.phase === Phase.Main) this.startMainPhaseLoop();
      else if (this.state.phase === Phase.Breeding) void this.nextActionDelay().then(() => this.runBreedingPhase());
    }
  }

  /** Which policy this seat is running — surfaced for benchmark reporting. */
  get policyName(): string {
    return this.policy.name;
  }

  /** Minimal scheduler state for headless stall diagnostics. */
  get diagnosticState(): { runningMainPhase: boolean; resumeMainPhaseWhenIdle: boolean } {
    return {
      runningMainPhase: this.runningMainPhase,
      resumeMainPhaseWhenIdle: this.resumeMainPhaseWhenIdle,
    };
  }

  onDecisionRequested(request: DecisionRequest): void {
    if (this.dormant) return;
    const requestedTurnCount = this.state.turnCount;
    const answer = () => this.answerDecision(request, requestedTurnCount);
    // A reactive [All Turns] clause has already interrupted an action. Holding its optional
    // choice for the ordinary main-phase think time leaves the effect visibly hanging after
    // its source has lit up; answer it on the same short reflex clock as combat windows.
    // Same clock for a decision raised INSIDE a security check. The reveal is on screen,
    // the engine is holding the attack on this answer, and the narration the think time
    // would wait for is the very scene this answer is blocking — so the main-phase pace
    // reads as the match freezing mid-check (match fd8ad770 stalled 5.2s on exactly this,
    // an [On Play] target choice from a card the bot's own security replacement played).
    if (request.options?.timing === "AllTurns" || this.resolvingSecurityCheck) {
      void this.reflex().then(answer);
      return;
    }
    void this.nextActionDelay().then(answer);
  }

  private answerDecision(request: DecisionRequest, requestedTurnCount: number): void {
    if (this.dormant) return;
    this.act(this.policy.answerDecision(this.view(), request));
    // Answering may have been what the phase driver was waiting on. Let the engine's
    // continuation settle before reading the phase and scheduling the next action.
    this.pendingContinuations++;
    void settleContinuation().finally(() => {
      this.pendingContinuations--;
      // A decision can finish a combat or effect that also ends the turn. The new
      // phaseChanged event owns the next turn; this stale callback must not act in it.
      if (this.dormant) return;
      if (this.state.turnCount !== requestedTurnCount || this.state.turnSeat !== this.seat) return;
      if (this.state.phase === Phase.Breeding) this.runBreedingPhase();
      else this.startMainPhaseLoop();
    });
  }

  /** Resume only after the engine's asynchronous combat continuation has settled. */
  onActionSettled(intentType: Intent["type"]): void {
    if (this.dormant) return;
    if (intentType !== "attack" || !this.isMyMainPhase()) return;
    if (this.runningMainPhase) {
      this.resumeMainPhaseWhenIdle = true;
      return;
    }
    this.startMainPhaseLoop();
  }

  onEvent(event: ServerEvent): void {
    if (this.dormant) return;
    switch (event.kind) {
      case "phaseChanged":
        if (event.phase !== Phase.None) {
          this.narrationUntil = Math.max(Date.now(), this.narrationUntil) + PHASE_NARRATION_MS;
        }
        if (event.turnSeat === this.seat) this.onOwnPhase(event.phase as Phase, event.turnCount);
        break;
      case "turnEnded":
        this.narrationUntil = Math.max(Date.now(), this.narrationUntil) + TURN_NARRATION_MS;
        break;
      case "attackDeclared":
        this.pendingAttackTargetsPlayer = event.target.kind === "player";
        break;
      case "cardPlayed":
        this.narrationUntil = Math.max(Date.now(), this.narrationUntil) + CARD_ARRIVAL_NARRATION_MS;
        break;
      case "effectTriggered":
        if (/on.?play|when.?digivolving/i.test(event.timing ?? "")) {
          this.narrationUntil = Math.max(Date.now(), this.narrationUntil) + EFFECT_CHOICE_NARRATION_MS;
        }
        break;
      case "securityRevealed":
        this.resolvingSecurityCheck = true;
        break;
      case "securityChecked":
        this.resolvingSecurityCheck = false;
        // Each check is its own centre-stage scene, and the client plays them one
        // after another, so a multi-check attack owes the sum of them.
        this.narrationUntil =
          Math.max(Date.now(), this.narrationUntil) +
          (event.resolution === "effect" ? SECURITY_EFFECT_NARRATION_MS : SECURITY_CHECK_NARRATION_MS);
        break;
      case "cardsMoved":
        // An effect that spends a security stack is narrated card by card, so a bot that
        // empties one owes the whole sequence before it may act again.
        if (event.from === Zone.Security && event.to === Zone.Trash) {
          this.narrationUntil =
            Math.max(Date.now(), this.narrationUntil) + event.instanceIds.length * SECURITY_DESTRUCTION_NARRATION_MS;
        }
        break;
      case "blockWindowOpened":
        if (this.state.turnSeat !== this.seat) {
          const context = {
            attackerPermanentId: event.attackerPermanentId,
            eligibleBlockerIds: event.eligibleBlockerIds,
            mustBlock: event.mustBlock === true,
            targetsPlayer: this.pendingAttackTargetsPlayer,
          };
          const forcedBlockerId = event.mustBlock === true ? event.eligibleBlockerIds[0] : undefined;
          const fallback: Intent =
            forcedBlockerId === undefined
              ? { type: "declineBlock" }
              : { type: "declareBlock", blockerPermanentId: forcedBlockerId };
          this.respondWithView(
            (view) => this.policy.chooseBlockResponse(view, context),
            fallback,
            () =>
              this.state.combatWindow?.kind === "block" &&
              this.state.combatWindow.seat === this.seat &&
              this.state.combatWindow.attackerPermanentId === event.attackerPermanentId,
          );
        }
        break;
      case "counterWindowOpened":
        if (event.defendingSeat === this.seat) {
          this.respondWithView((view) => this.policy.chooseCounterResponse(view, event), { type: "respondCounter" });
        }
        break;
      case "alliancePrompt":
        if (this.controls(event.permanentId)) {
          this.respondWithView((view) => this.policy.chooseAllianceResponse(view, event), { type: "respondAlliance" });
        }
        break;
      case "evadePrompt":
        if (this.controls(event.permanentId)) {
          this.respondWithView((view) => this.policy.chooseEvadeResponse(view, event.permanentId), {
            type: "respondEvade",
            permanentId: event.permanentId,
            accept: false,
          });
        }
        break;
      case "barrierPrompt":
        if (this.controls(event.permanentId)) {
          this.respondWithView((view) => this.policy.chooseBarrierResponse(view, event.permanentId), {
            type: "respondBarrier",
            permanentId: event.permanentId,
            accept: false,
          });
        }
        break;
    }
  }

  /** True when the named permanent is one this seat controls. */
  private controls(permanentId: string): boolean {
    const player = this.state.players[this.seat];
    if (player === undefined) return false;
    if (player.breeding?.permanentId === permanentId) return true;
    for (const permanent of player.battleArea) {
      if (permanent.permanentId === permanentId) return true;
    }
    return false;
  }

  /**
   * Answer a combat window. Every one of these blocks the engine on an unresolved promise
   * until this seat responds, so a path that returns without sending anything wedges the
   * match — which is why an unreadable view falls back to the passive answer rather than
   * staying silent. Answered on a reflex rather than a think time: the attack is frozen
   * on the attacker's screen until it lands.
   */
  private respondWithView(
    choose: (view: BotView) => Intent,
    fallback: Intent,
    stillOpen: () => boolean = () => true,
  ): void {
    void this.reflex().then(() => {
      if (this.dormant) return;
      if (!stillOpen()) return;
      const view = this.view();
      this.act(view === undefined ? fallback : choose(view));
    });
  }

  private view(): BotView | undefined {
    return buildBotView(this.state, this.seat);
  }

  /** Send an intent and tell the policy when the engine refused it. */
  private act(intent: Intent): IntentResult | void {
    if (this.dormant) return;
    const result = this.sendIntent(intent);
    if (result !== undefined && result.ok === false) this.policy.noteRejected(intent);
    return result;
  }

  private onOwnPhase(phase: Phase, turnCount: number): void {
    if (this.dormant) return;
    if (turnCount !== this.lastTurnStarted) {
      this.lastTurnStarted = turnCount;
      // A turn change can reach the client before its security scene ends.
      // Keep the deadline; elapsed narration naturally stops delaying this seat.
      this.policy.onTurnStart();
    }
    switch (phase) {
      case Phase.Breeding:
        void this.nextActionDelay().then(() => this.runBreedingPhase());
        break;
      case Phase.Main:
        this.startMainPhaseLoop();
        break;
    }
  }

  private startMainPhaseLoop(): void {
    if (!this.isMyMainPhase()) return;
    if (this.runningMainPhase) {
      this.resumeMainPhaseWhenIdle = true;
      return;
    }
    this.runningMainPhase = true;
    void this.runMainPhaseLoop().finally(() => {
      this.runningMainPhase = false;
      if (this.resumeMainPhaseWhenIdle) {
        this.resumeMainPhaseWhenIdle = false;
        this.startMainPhaseLoop();
      }
    });
  }

  private runBreedingPhase(): void {
    if (
      this.dormant ||
      this.state.gameOver ||
      this.state.turnSeat !== this.seat ||
      this.state.phase !== Phase.Breeding ||
      this.state.pendingDecision !== undefined
    )
      return;
    if (this.breedingActionTurn === this.state.turnCount) return;
    const view = this.view();
    if (view === undefined) {
      this.breedingActionTurn = this.state.turnCount;
      this.act({ type: "endPhase" });
      return;
    }
    this.breedingActionTurn = this.state.turnCount;
    const result = this.act(this.policy.chooseBreedingAction(view));
    if (result !== undefined && result.ok === false) this.breedingActionTurn = -1;
  }

  private async runMainPhaseLoop(): Promise<void> {
    // Yield once so any synchronous effects from the phase transition settle.
    await microtask();

    let actionStep = 0;
    while (actionStep < MAX_MAIN_PHASE_ACTIONS) {
      if (!this.isMyMainPhase()) return;

      const pending = this.state.pendingDecision;
      if (pending !== undefined) {
        if (pending.seat !== this.seat) {
          // A decision for the opponent blocks our actions too. Keep the active seat's
          // driver alive until it closes: only the responding bot is notified directly.
          await microtask();
          continue;
        }
        // Our own decision; onDecisionRequested answers it and restarts this loop.
        return;
      }
      actionStep++;

      await this.nextActionDelay();
      // The delay can outlast the window we planned in (combat resolved, a decision
      // arrived); re-validate before acting and let the loop re-evaluate if so.
      if (!this.isMyMainPhase() || this.state.pendingDecision !== undefined) continue;

      const view = this.view();
      if (view === undefined) break;

      const intent = this.policy.chooseMainAction(view);
      if (intent.type === "endPhase") {
        this.act(intent);
        return;
      }

      const result = this.act(intent);
      if (result !== undefined && result.ok === false) continue; // re-plan without it
      if (intent.type === "attack") {
        // Combat is asynchronous. The host restarts this loop through onActionSettled
        // only after security/battle/end-of-attack has fully resolved.
        return;
      }
      await microtask();
    }

    if (this.isMyMainPhase() && this.state.pendingDecision === undefined) this.act({ type: "endPhase" });
  }

  private isMyMainPhase(): boolean {
    return (
      !this.dormant && !this.state.gameOver && this.state.turnSeat === this.seat && this.state.phase === Phase.Main
    );
  }

  /** The answer to a combat window, which the engine and the attacker are both waiting on. */
  private reflex(): Promise<void> {
    return this.waitForPause(COMBAT_REFLEX_MIN_MS, COMBAT_REFLEX_MAX_MS);
  }

  /**
   * The beat before the next main-phase action. Ordinarily the think time, but an attack
   * that spent security leaves the opposing client narrating the check for longer than
   * that, so the wait is stretched to cover it: the next card is played once the clash
   * has handed the board back, never on top of it.
   */
  private async nextActionDelay(): Promise<void> {
    const narration = Math.max(0, this.narrationUntil - Date.now());
    await this.waitForPause(Math.max(this.minThinkMs, narration), Math.max(this.maxThinkMs, narration));
    // More checks can arrive while this seat is already waiting to act.
    while (this.usesRealTimePacing && this.narrationUntil > Date.now()) {
      const remaining = this.narrationUntil - Date.now();
      await this.waitForPause(remaining, remaining);
    }
  }

  private async waitForPause(minMs: number, maxMs: number): Promise<void> {
    this.pendingWaits++;
    try {
      await this.pause(minMs, maxMs);
    } finally {
      this.pendingWaits--;
    }
  }
}

function microtask(): Promise<void> {
  return new Promise<void>((resolve) => setImmediate(resolve));
}

async function settleContinuation(): Promise<void> {
  // Decision resolution may unwind several nested trigger promises before the main verb
  // queue is ready again. Keep this headless-safe; real-time bots already wait seconds.
  for (let step = 0; step < 10; step++) await microtask();
}
