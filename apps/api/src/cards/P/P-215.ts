import { EffectTiming, EffectDuration, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, turnTiming, whenDigivolving, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "P-215";

function hasIceOrMineralOrRock(def: CardDefinition): boolean {
  return (def.types ?? []).some((t) => t === "Ice-Snow" || t === "Mineral" || t === "Rock");
}

const _UNDER_TRAITS = ["Ice-Snow", "Mineral", "Rock"];

function isSelfMove(ctx: EffectContext, source: CardSource): boolean {
  return ctx.trigger?.movedPermanentId === source.permanent()?.permanentId;
}

async function placeAndProtect(
  ctx: Parameters<NonNullable<Parameters<typeof onPlay>[0]["resolve"]>>[0],
  source: CardSource,
) {
  const self = source.permanent();
  if (self === undefined) return;
  const owner = ctx.game.player(source.ownerSeat);
  const candidates = Array.from(owner.hand)
    .concat(Array.from(owner.trash))
    .filter((c) => {
      const def = ctx.game.definitionOf(c);
      return isDigimon(def) && (def.level ?? 99) <= 4 && hasIceOrMineralOrRock(def);
    });
  if (candidates.length > 0) {
    const chosen = await ctx.ask.selectCards(ctx, {
      candidates: candidates.map((c) => c.instanceId),
      min: 0,
      max: 1,
    });
    if (chosen.length > 0) {
      await ctx.fx.placeUnder(self.permanentId, chosen);
      const myDigi = Array.from(owner.battleArea)
        .filter((p) => p.topCard !== undefined && hasIceOrMineralOrRock(ctx.game.definitionOf(p.topCard)))
        .map((p) => p.permanentId);
      if (myDigi.length > 0) {
        const protect = await ctx.ask.chooseTargets(ctx, {
          candidates: myDigi,
          min: 1,
          max: 1,
        });
        if (protect.length > 0) {
          ctx.fx.restrict(protect[0]!, "beReturned", EffectDuration.UntilOpponentTurnEnd, {
            byOpponentEffectsOnly: true,
          });
        }
      }
    }
  }
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnEnterFieldAnyone) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play`,
          description:
            "[On Play] By placing 1 level 4 or lower [Ice-Snow]/[Mineral]/[Rock] trait card " +
            "from your hand or trash under this Digimon, 1 of your [Ice-Snow]/[Mineral]/[Rock] " +
            "trait Digimon can't be returned to hand/deck/de-digivolved until opponent's turn end.",
          optional: true,
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            await placeAndProtect(ctx, source);
          },
        }),
      ];
    }

    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving`,
          description:
            "[When Digivolving] By placing 1 level 4 or lower [Ice-Snow]/[Mineral]/[Rock] " +
            "trait card from your hand or trash under this Digimon, 1 of your [Ice-Snow]..." +
            "trait Digimon can't be returned to hand/deck/de-digivolved until opponent's turn end.",
          optional: true,
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            await placeAndProtect(ctx, source);
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/blocker`,
          description: "＜Blocker＞",
          isInherited: true,
          when: (_ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self !== undefined) {
              ctx.fx.grantKeyword(self.permanentId, "Blocker", EffectDuration.UntilEachTurnEnd);
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnMove) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/when-moving`,
          description:
            "[When Moving] By placing 1 level 4 or lower [Ice-Snow]/[Mineral]/[Rock] trait " +
            "card from your hand or trash under this Digimon, 1 of your [Ice-Snow]...trait " +
            "Digimon can't be returned until opponent's turn end.",
          optional: true,
          when: (ctx) => source.isOnBattleArea() && isSelfMove(ctx, source),
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            await placeAndProtect(ctx, source);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
