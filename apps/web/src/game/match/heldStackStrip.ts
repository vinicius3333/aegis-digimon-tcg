import type { PlayerState } from "@aegis/shared";
import type { HeldStackStrip } from "./types";

/** A bounced stack host reaches the hand only after its source peels finish. */
export function stackStripHand(player: PlayerState, held: readonly HeldStackStrip[]): PlayerState {
  const returned = held.filter((strip) => strip.returnedInstanceId !== undefined);
  if (returned.length === 0) return player;
  const ids = new Set(returned.map((strip) => strip.returnedInstanceId!));
  return {
    ...player,
    ...(player.hand === undefined ? {} : { hand: player.hand.filter((card) => !ids.has(card.instanceId)) }),
    // Opponent hands are redacted, so count the public movement events, not visible cards.
    handCount: Math.max(0, player.handCount - ids.size),
  } as PlayerState;
}
