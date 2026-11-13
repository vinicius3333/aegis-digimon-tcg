import type { CardInstance } from "@aegis/shared";
import type { EffectContext } from "../../EffectContext.js";
import { createCardSource } from "../../../cards/CardSource.js";
import { runtimeCompiledCard } from "../compiledCards.js";
import { evaluateCondition } from "../conditions.js";

export function prospectiveColorWaiver(ctx: EffectContext, card: CardInstance): boolean {
  const waiverEffects =
    runtimeCompiledCard(card.cardId)?.effects.filter(
      (effect) =>
        (effect.trigger === "Static" || effect.trigger === "Rule") &&
        effect.actions.length > 0 &&
        effect.actions.every(
          (action) =>
            action.kind === "WaiveColorRequirement" &&
            (action.target === undefined || action.target.isSelf === true || action.target.filter.isSelfRef === true),
        ),
    ) ?? [];
  if (waiverEffects.length === 0) return false;
  const source = createCardSource(card, {
    permanentOf: () => undefined,
    isOnBattleArea: () => false,
    isInHand: () => true,
    isSeatsTurn: (seat) => ctx.game.state.turnSeat === seat,
  });
  const cardCtx = { ...ctx, source };
  return waiverEffects.some(
    (effect) =>
      (effect.condition === undefined || evaluateCondition(cardCtx, effect.condition)) &&
      effect.actions.some(
        (action) =>
          action.kind === "WaiveColorRequirement" &&
          action.color === undefined &&
          (action.condition === undefined || evaluateCondition(cardCtx, action.condition)),
      ),
  );
}
