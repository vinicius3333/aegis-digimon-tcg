import { CardKind, EffectTiming } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT15-099 — Venom Infusion (BT15, Black/Purple Option).
 *
 *
 *   [Main] / [Security]:
 *     1. Trash 1 Digimon from hand (optional cost — "by trashing").
 *     2. If the trashed card has a level, delete 1 opponent Digimon with level ≤ that level.
 *        (KB Q2596: Lv.- Digimon have no level and cannot target Lv.- opponent Digimon.)
 *     3. If the trashed card's name or text contains "Myotismon", draw 2 cards.
 *   [Security] activates the same body as [Main].
 *
 * KB rulings (binding):
 *   Q2596: Lv.- Digimon cards (no level) cannot be targeted by level-conditional effects.
 *     If you trash a Lv.- card, you cannot delete any opponent Digimon.
 */
const cardId = "BT15-099";

function cardMentionsMyotismon(def: CardDefinition): boolean {
  return (
    def.nameEn.includes("Myotismon") ||
    (def.effectText?.includes("Myotismon") ?? false) ||
    (def.inheritedEffectText?.includes("Myotismon") ?? false) ||
    (def.securityEffectText?.includes("Myotismon") ?? false)
  );
}

async function resolveMainBody(
  ctx: import("../../engine/effects/EffectContext.js").EffectContext,
  source: CardSource,
): Promise<void> {
  const ownerSeat = source.ownerSeat;
  const ownerPlayer = ctx.game.player(ownerSeat);

  const handDigimon = Array.from(ownerPlayer.hand).filter((c) => {
    const def = ctx.game.definitionOf(c);
    return (def.kinds as string[]).includes(CardKind.Digimon as string);
  });

  if (handDigimon.length === 0) return;

  const toTrash = await ctx.ask.selectCards(ctx, {
    candidates: handDigimon.map((c) => c.instanceId),
    min: 0,
    max: 1,
  });
  if (toTrash.length === 0) return;

  const trashedInstanceId = toTrash[0]!;
  const trashedCard = handDigimon.find((c) => c.instanceId === trashedInstanceId);
  if (trashedCard === undefined) return;
  const trashedDef = ctx.game.definitionOf(trashedCard);

  await ctx.fx.trash([trashedInstanceId]);

  const trashedLevel = trashedDef.level;
  const hasMyotismon = cardMentionsMyotismon(trashedDef);

  // KB Q2596: only attempt delete if the trashed card has a level.
  if (trashedLevel !== undefined) {
    const oppSeat = ctx.game.opponentOf(ownerSeat);
    const eligibleTargets = Array.from(ctx.game.player(oppSeat).battleArea)
      .filter((p) => {
        if (p.inBreeding || p.topCard === undefined) return false;
        const def = ctx.game.definitionOf(p.topCard);
        // Lv.- opponents (no level) are excluded by the level comparison.
        return def.level !== undefined && def.level <= trashedLevel;
      })
      .map((p) => p.permanentId);

    if (eligibleTargets.length > 0) {
      const chosen = await ctx.ask.chooseTargets(ctx, {
        candidates: eligibleTargets,
        min: 1,
        max: 1,
      });
      if (chosen.length > 0) {
        await ctx.fx.deletePermanent(chosen);
      }
    }
  }

  if (hasMyotismon) {
    await ctx.fx.draw(ownerSeat, 2);
  }
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Main] Trash 1 Digimon from hand; delete 1 opponent Digimon with level ≤ trashed card's
    // level; if trashed card mentions Myotismon, draw 2.
    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-trash-delete-myotismon-draw`,
          description:
            "[Main] By trashing 1 Digimon card in your hand, delete 1 of your opponent's Digimon " +
            "whose level is less than or equal to the trashed card's level. When a card with " +
            "[Myotismon] in its text is trashed by this effect, draw 2 cards from your deck.",
          resolve: async (ctx) => resolveMainBody(ctx, source),
        }),
      ];
    }

    // [Security] Activate this card's [Main] effect.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-activate-main`,
          description: "[Security] Activate this card's [Main] effect.",
          resolve: async (ctx) => resolveMainBody(ctx, source),
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
