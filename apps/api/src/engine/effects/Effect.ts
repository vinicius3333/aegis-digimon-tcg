import type { EffectContext } from "./EffectContext.js";

/**
 * TS analogue of the source `ICardEffect`. Card files almost never
 * construct this by hand; they use the timing builders in builders.ts, which set
 * the right flags (card-module contract).
 */
export interface Effect {
  /** Original declarative trigger, retained for selective stack-effect conferrals. */
  irTrigger?: string;
  /** Stable id within the card (analogue of HashString); e.g. "BT7-089/pierce". */
  effectKey: string;
  /** Rules text shown in the log / decision prompt. */
  description: string;
  /** Optional printed timing label used when the engine routes a trigger through a shared window. */
  timingOverride?: string;
  /** Must the controller be asked? (source IsOptional) */
  optional: boolean;
  /** Granted via the digivolution stack? (source IsInheritedEffect) */
  isInherited: boolean;
  /** Triggered from security? (source IsSecurityEffect) */
  isSecurity: boolean;
  /** From the Link mechanic? (source IsLinkedEffect) */
  isLinked: boolean;
  /** -1 = unlimited (source MaxCountPerTurn). */
  maxPerTurn: number;
  /** Narrows the overloaded BeforePayCost timing to a play or digivolve declaration. */
  costWindow?: "play" | "digivolve";
  /** True when this pay-time effect is itself a play-cost reducer. */
  isPlayCostReduction?: boolean;
  /**
   * Ordering tier inside a continuous recomputation. Effects that read a keyword
   * granted by another continuous effect run after ordinary providers, so their
   * result cannot depend on physical stack order.
   */
  continuousPriority?: number;

  canTrigger(ctx: EffectContext): boolean;
  canActivate(ctx: EffectContext): boolean;
  /** The Activate(...) body; await player decisions here. */
  resolve(ctx: EffectContext): Promise<void>;
}
