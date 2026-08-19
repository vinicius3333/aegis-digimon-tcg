// @ts-nocheck
import { EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { matchNameOrTrait } from "../../engine/effects/interpreter.js";

const cardId = "BT24-066";

function qualifies(def: any): boolean {
  return (
    matchNameOrTrait(def, {
      tokens: ["Evil", "Dark Dragon", "Evil Dragon", "Dark Knight"],
      match: "trait",
    }) ||
    ((def.kinds ?? []).includes("Tamer") && (def.colors ?? []).includes("Purple"))
  );
}

async function revealSearchAndTrash(ctx: any, source: CardSource): Promise<void> {
  const revealed = await ctx.fx.reveal(source.ownerSeat, 3);
  const candidates = revealed.filter((card: any) => qualifies(ctx.game.definitionOf(card)));
  if (candidates.length > 0) {
    const added = await ctx.ask.selectCards(ctx, {
      candidates: candidates.map((card: any) => card.instanceId),
      min: 1,
      max: 1,
    });
    if (added.length > 0) {
      await ctx.fx.returnToHand(added);
      const remaining = candidates.filter((card: any) => !added.includes(card.instanceId));
      if (remaining.length > 0) {
        const trashed = await ctx.ask.selectCards(ctx, {
          candidates: remaining.map((card: any) => card.instanceId),
          min: 1,
          max: 1,
        });
        if (trashed.length > 0) await ctx.fx.trash(trashed);
      }
      const used = new Set([...added]);
      const rest = revealed
        .filter(
          (card: any) =>
            !used.has(card.instanceId) &&
            !ctx.game.player(source.ownerSeat).trash.some((c: any) => c.instanceId === card.instanceId),
        )
        .map((card: any) => card.instanceId);
      if (rest.length > 0) await ctx.fx.returnToDeck(rest, { toTop: false });
      return;
    }
  }
  if (revealed.length > 0)
    await ctx.fx.returnToDeck(
      revealed.map((card: any) => card.instanceId),
      { toTop: false },
    );
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnPlay)
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play`,
          optional: false,
          description:
            "Reveal the top 3 cards. Add 1 qualifying trait card or purple Tamer, trash 1 such card, bottom the rest, then trash 1 card in hand.",
          resolve: async (ctx) => {
            await revealSearchAndTrash(ctx, source);
            const hand = ctx.game.player(source.ownerSeat).hand.map((card: any) => card.instanceId);
            if (hand.length > 0) {
              const chosen = await ctx.ask.selectCards(ctx, { candidates: hand, min: 1, max: 1 });
              if (chosen.length > 0) await ctx.fx.trash(chosen);
            }
          },
        }),
      ];
    if (timing === EffectTiming.OnUseAttack)
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/inherited-delete`,
          isInherited: true,
          maxPerTurn: 1,
          description: "Delete 1 of your opponent's level 3 Digimon.",
          resolve: async (ctx) => {
            const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
            const targets = opponent.battleArea.filter(
              (p: any) => p.topCard && ctx.game.definitionOf(p.topCard).level === 3,
            );
            if (targets.length > 0) {
              const chosen = await ctx.ask.chooseTargets(ctx, {
                candidates: targets.map((p: any) => p.permanentId),
                min: 1,
                max: 1,
              });
              if (chosen.length > 0) await ctx.fx.deletePermanent(chosen);
            }
          },
        }),
      ];
    return [];
  },
};

registerCard(module);
export default module;
