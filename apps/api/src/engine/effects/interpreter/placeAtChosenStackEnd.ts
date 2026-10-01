import type { EffectContext } from "../EffectContext.js";
import type { CardInstance } from "@aegis/shared";

/**
 * "As this Digimon's top or bottom digivolution cards": one top-or-bottom choice covers
 * the whole group, the controller orders the group, and every card enters the stack in a
 * single placement (Comprehensive Rules §3-1-3-3, §3-1-3-4).
 */
export async function placeAtChosenStackEnd(
  ctx: EffectContext,
  hostId: string,
  instanceIds: string[],
  visibleCards: { instanceId: string; cardId: string }[],
  faceUp: boolean,
): Promise<CardInstance[]> {
  const atTop = (await ctx.ask.chooseOption(ctx, ["top", "bottom"])) === 0;
  const ordered =
    instanceIds.length > 1 && ctx.ask.orderCards !== undefined
      ? await ctx.ask.orderCards(ctx, {
          candidates: instanceIds,
          visibleCards,
          destination: atTop ? "stackTop" : "stackBottom",
        })
      : instanceIds;
  // Order position 1 is the card nearest the chosen end. The primitive inserts one card at
  // a time at that end, so the last card it inserts lands nearest the end.
  return ctx.fx.placeUnder(hostId, [...ordered].reverse(), { belowTop: atTop, faceUp });
}
