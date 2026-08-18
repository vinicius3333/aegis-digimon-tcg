import {
  Phase,
  type DecisionRequest,
  type GameState,
  type Intent,
  type IntentResult,
  type Seat,
  type ServerEvent,
} from "@aegis/shared";
import { createEvaluationPolicy, type BotPolicy } from "./policy.js";
import { resolveBotProfile, type BotProfile, type BotProfileName } from "./profiles.js";
import { createBotRandom } from "./rng.js";
import { buildBotView, type BotView } from "./view.js";

/** Default think-time window (ms) so the bot does not act instantaneously. */
const DEFAULT_ACTION_DELAY_MS = 2_000;

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
}

/**
 * Bot seat driver: owns the asynchronous plumbing, owns none of the judgement.
 *
 * It runs in-process, calling `applyIntent` through the supplied callback — no network
 * hop, and it shares the engine's state reference with the room that hosts it. Every
 * "what should I do" question is delegated to a {@link BotPolicy}; this class only
 * decides WHEN to ask (phase transitions, decision requests, combat windows) and paces
 * the answers behind a think delay so play feels human.
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
  /** The attack currently in its block window, so the block appraisal knows the target. */
  private pendingAttackTargetsPlayer = true;
  private readonly minThinkMs: number;
  private readonly maxThinkMs: number;
  private readonly policy: BotPolicy;
  private readonly delay: () => Promise<void>;

  constructor(
    private readonly seat: Seat,
    private readonly state: GameState,
    private readonly sendIntent: (intent: Intent) => IntentResult | void,
    options: BotOptions = {},
  ) {
    this.minThinkMs = options.minThinkMs ?? DEFAULT_ACTION_DELAY_MS;
    this.maxThinkMs = Math.max(options.maxThinkMs ?? DEFAULT_ACTION_DELAY_MS, this.minThinkMs);
    const seed = options.seed ?? 0x5eed;
    this.policy =
      options.policy ??
      createEvaluationPolicy({ profile: resolveBotProfile(options.profile), seed });
    const random = createBotRandom(seed ^ 0x9e37);
    this.delay =
      options.thinkDelay ??
      (() => {
        const span = this.maxThinkMs - this.minThinkMs;
        const ms = this.minThinkMs + Math.floor(random.next() * (span + 1));
        return new Promise<void>((resolve) => setTimeout(resolve, ms));
      });
  }

  /** Which policy this seat is running — surfaced for benchmark reporting. */
  get policyName(): string {
    return this.policy.name;
  }

  onDecisionRequested(request: DecisionRequest): void {
    void this.afterThinking(() => {
      this.act(this.policy.answerDecision(this.view(), request));
      // Answering may have been what the main-phase loop was waiting on; restart it.
      this.startMainPhaseLoop();
    });
  }

  /** Resume only after the engine's asynchronous combat continuation has settled. */
  onActionSettled(intentType: Intent["type"]): void {
    if (intentType !== "attack" || !this.isMyMainPhase()) return;
    if (this.runningMainPhase) {
      this.resumeMainPhaseWhenIdle = true;
      return;
    }
    this.startMainPhaseLoop();
  }

  onEvent(event: ServerEvent): void {
    switch (event.kind) {
      case "phaseChanged":
        if (event.turnSeat === this.seat) this.onOwnPhase(event.phase as Phase, event.turnCount);
        break;
      case "attackDeclared":
        this.pendingAttackTargetsPlayer = event.target.kind === "player";
        break;
      case "blockWindowOpened":
        if (this.state.turnSeat !== this.seat) {
          const context = {
            attackerPermanentId: event.attackerPermanentId,
            eligibleBlockerIds: event.eligibleBlockerIds,
            targetsPlayer: this.pendingAttackTargetsPlayer,
          };
          this.respondWithView(
            (view) => this.policy.chooseBlockResponse(view, context),
            { type: "declineBlock" },
          );
        }
        break;
      case "counterWindowOpened":
        if (event.defendingSeat === this.seat) {
          this.respondWithView(
            (view) => this.policy.chooseCounterResponse(view, event),
            { type: "respondCounter" },
          );
        }
        break;
      case "alliancePrompt":
        if (this.controls(event.permanentId)) {
          this.respondWithView(
            (view) => this.policy.chooseAllianceResponse(view, event),
            { type: "respondAlliance" },
          );
        }
        break;
      case "evadePrompt":
        if (this.controls(event.permanentId)) {
          this.respondWithView(
            (view) => this.policy.chooseEvadeResponse(view, event.permanentId),
            { type: "respondEvade", permanentId: event.permanentId, accept: false },
          );
        }
        break;
      case "barrierPrompt":
        if (this.controls(event.permanentId)) {
          this.respondWithView(
            (view) => this.policy.chooseBarrierResponse(view, event.permanentId),
            { type: "respondBarrier", permanentId: event.permanentId, accept: false },
          );
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
   * staying silent.
   */
  private respondWithView(choose: (view: BotView) => Intent, fallback: Intent): void {
    void this.afterThinking(() => {
      const view = this.view();
      this.act(view === undefined ? fallback : choose(view));
    });
  }

  private view(): BotView | undefined {
    return buildBotView(this.state, this.seat);
  }

  /** Send an intent and tell the policy when the engine refused it. */
  private act(intent: Intent): IntentResult | void {
    const result = this.sendIntent(intent);
    if (result !== undefined && result.ok === false) this.policy.noteRejected(intent);
    return result;
  }

  private onOwnPhase(phase: Phase, turnCount: number): void {
    if (turnCount !== this.lastTurnStarted) {
      this.lastTurnStarted = turnCount;
      this.policy.onTurnStart();
    }
    switch (phase) {
      case Phase.Breeding:
        void this.afterThinking(() => this.runBreedingPhase());
        break;
      case Phase.Main:
        this.startMainPhaseLoop();
        break;
    }
  }

  private startMainPhaseLoop(): void {
    if (!this.isMyMainPhase() || this.runningMainPhase) return;
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
    const view = this.view();
    if (view === undefined) {
      this.act({ type: "endPhase" });
      return;
    }
    this.act(this.policy.chooseBreedingAction(view));
  }

  private async runMainPhaseLoop(): Promise<void> {
    // Yield once so any synchronous effects from the phase transition settle.
    await microtask();

    let actionStep = 0;
    let waitStep = 0;
    while (actionStep < MAX_MAIN_PHASE_ACTIONS) {
      if (!this.isMyMainPhase()) return;

      const pending = this.state.pendingDecision;
      if (pending !== undefined) {
        if (pending.seat !== this.seat) {
          // A decision for the opponent blocks our actions too; yield and retry.
          if (++waitStep > 100) return;
          await microtask();
          continue;
        }
        // Our own decision; onDecisionRequested answers it and restarts this loop.
        return;
      }
      waitStep = 0;
      actionStep++;

      await this.delay();
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

    if (this.isMyMainPhase()) this.act({ type: "endPhase" });
  }

  private isMyMainPhase(): boolean {
    return (
      !this.state.gameOver &&
      this.state.turnSeat === this.seat &&
      this.state.phase === Phase.Main
    );
  }

  /** Run `action` after a short think-delay. */
  private afterThinking(action: () => void): Promise<void> {
    return this.delay().then(action);
  }
}

function microtask(): Promise<void> {
  return new Promise<void>((resolve) => setImmediate(resolve));
}
