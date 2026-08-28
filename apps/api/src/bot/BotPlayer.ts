import {
  Phase,
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
import { resolveBotProfile, type BotProfile, type BotProfileName } from "./profiles.js";
import { createBotRandom } from "./rng.js";
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
}

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
  /** The attack currently in its block window, so the block appraisal knows the target. */
  private pendingAttackTargetsPlayer = true;
  private readonly minThinkMs: number;
  private readonly maxThinkMs: number;
  private readonly policy: BotPolicy;
  /** Narration the opposing client still owes the last attack, in milliseconds. */
  private pendingNarrationMs = 0;
  private readonly pause: (minMs: number, maxMs: number) => Promise<void>;

  constructor(
    private readonly seat: Seat,
    private readonly state: GameState,
    private readonly sendIntent: (intent: Intent) => IntentResult | void,
    options: BotOptions = {},
  ) {
    this.minThinkMs = options.minThinkMs ?? DEFAULT_MIN_ACTION_DELAY_MS;
    this.maxThinkMs = Math.max(options.maxThinkMs ?? DEFAULT_MAX_ACTION_DELAY_MS, this.minThinkMs);
    const seed = options.seed ?? 0x5eed;
    this.policy = options.policy ?? createEvaluationPolicy({ profile: resolveBotProfile(options.profile), seed });
    const random = createBotRandom(seed ^ 0x9e37);
    const injected = options.thinkDelay;
    this.pause = injected
      ? () => injected()
      : (minMs, maxMs) =>
          new Promise<void>((resolve) => setTimeout(resolve, minMs + Math.floor(random.next() * (maxMs - minMs + 1))));
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
      case "securityChecked":
        // Each check is its own centre-stage scene, and the client plays them one
        // after another, so a multi-check attack owes the sum of them.
        this.pendingNarrationMs +=
          event.resolution === "effect" ? SECURITY_EFFECT_NARRATION_MS : SECURITY_CHECK_NARRATION_MS;
        break;
      case "cardsMoved":
        // An effect that spends a security stack is narrated card by card, so a bot that
        // empties one owes the whole sequence before it may act again.
        if (event.from === Zone.Security && event.to === Zone.Trash) {
          this.pendingNarrationMs += event.instanceIds.length * SECURITY_DESTRUCTION_NARRATION_MS;
        }
        break;
      case "blockWindowOpened":
        if (this.state.turnSeat !== this.seat) {
          const context = {
            attackerPermanentId: event.attackerPermanentId,
            eligibleBlockerIds: event.eligibleBlockerIds,
            targetsPlayer: this.pendingAttackTargetsPlayer,
          };
          this.respondWithView((view) => this.policy.chooseBlockResponse(view, context), { type: "declineBlock" });
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
  private respondWithView(choose: (view: BotView) => Intent, fallback: Intent): void {
    void this.reflex().then(() => {
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
      // Whatever the previous turn's checks still owed was narrated while this seat
      // was not acting, so it must not be charged against its first action here.
      this.pendingNarrationMs = 0;
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

    if (this.isMyMainPhase()) this.act({ type: "endPhase" });
  }

  private isMyMainPhase(): boolean {
    return !this.state.gameOver && this.state.turnSeat === this.seat && this.state.phase === Phase.Main;
  }

  /** Run `action` after a short think-delay. */
  private afterThinking(action: () => void): Promise<void> {
    return this.delay().then(action);
  }

  private delay(): Promise<void> {
    return this.pause(this.minThinkMs, this.maxThinkMs);
  }

  /** The answer to a combat window, which the engine and the attacker are both waiting on. */
  private reflex(): Promise<void> {
    return this.pause(COMBAT_REFLEX_MIN_MS, COMBAT_REFLEX_MAX_MS);
  }

  /**
   * The beat before the next main-phase action. Ordinarily the think time, but an attack
   * that spent security leaves the opposing client narrating the check for longer than
   * that, so the wait is stretched to cover it: the next card is played once the clash
   * has handed the board back, never on top of it.
   */
  private nextActionDelay(): Promise<void> {
    const narration = this.pendingNarrationMs;
    this.pendingNarrationMs = 0;
    if (narration === 0) return this.delay();
    return this.pause(Math.max(this.minThinkMs, narration), Math.max(this.maxThinkMs, narration));
  }
}

function microtask(): Promise<void> {
  return new Promise<void>((resolve) => setImmediate(resolve));
}
