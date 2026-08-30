import type { EffectTiming, EffectTrigger } from "@aegis/shared";
import type { CardSource } from "./CardSource.js";
import type { Effect } from "./Effect.js";
import type { EffectContext } from "./EffectContext.js";

/**
 * The contract every card file satisfies.
 */
export interface EffectModule {
  /** Card id this module implements, e.g. "BT7-089". */
  readonly cardId: string;
  /** Trigger tags represented by a handwritten module when no compiled IR effects exist. */
  readonly declaredTriggers?: readonly EffectTrigger[];
  /**
   * Return the effects this card contributes at the given timing window for this
   * source. Branch on `timing`, push one Effect per clause (use the builders).
   * Return [] when the card does nothing at `timing`.
   */
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[];
  /**
   * Resolve this loose card's own "when this card is trashed from your deck" clause.
   * Unlike a normal timing contribution, the source is already loose in trash and no
   * battle-area static could have installed a watcher. Hand-written modules use this
   * hook instead of depending on serialized IR for the self-resolving mill seam.
   */
  onTrashedFromDeck?(ctx: EffectContext): Promise<void>;
}
