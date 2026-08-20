import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { CardDefinition, CardInstance } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, whenDigivolving, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * EX12-048 — SeitenGokuumon (EX12, Red Lv.7 Digimon).
 *
 *
 * Alt digivolve: from Lv.5 [Gokuumon] text or [Shambala] trait at cost 3 (in digivolutionRequirement).
 *
 * [Static] ＜Rush＞, ＜Raid＞, ＜Piercing＞, ＜Security Attack +1＞
 * [On Play] / [When Digivolving]:
 *   1 of your opponent's Digimon gets -8000 DP (and -3000 DP for each Lv.5 digivolution
 *   card this Digimon has) until your opponent's next turn. Then, this Digimon may attack.
 * [All Turns] (when would leave battle area NOT by own effect):
 *   You may play 2 Lv.5 cards with [Gokuumon] in their texts or the [SW] trait from this
 *   Digimon's digivolution cards without paying the cost.
 *
 * The engine's `wouldLeavePlay` `instead` replacement runs its side effect and then continues
 * the original departure, which matches this card's "would leave ... you may play" wording.
 */
const cardId = "EX12-048";

function hasGokuumonOrSW(def: CardDefinition): boolean {
  const haystack = [
    def.nameEn,
    def.effectText,
    def.inheritedEffectText,
    def.securityEffectText,
    ...(def.types ?? []),
  ];
  return haystack.some(
    (t) => t !== undefined && (t.toLowerCase().includes("gokuumon") || t.includes("SW")),
  );
}

/** Count Lv.5 digivolution cards in the source permanent's stack. */
function countLv5Stack(ctx: Parameters<Effect["resolve"]>[0]): number {
  const self = ctx.source.permanent();
  if (self === undefined) return 0;
  return self.stack.filter((c) => {
    const def = ctx.game.definitionOf(c);
    return def.level === 5;
  }).length;
}

/** Shared resolve body for [On Play] and [When Digivolving]. */
async function dpAndAttack(ctx: Parameters<Effect["resolve"]>[0]): Promise<void> {
  const self = ctx.source.permanent();
  if (self === undefined) return;

  const opponentSeat = ctx.game.opponentOf(ctx.source.ownerSeat);
  const oppDigimon = ctx.game
    .player(opponentSeat)
    .battleArea.filter((p) => {
      if (p.topCard === undefined) return false;
      const def = ctx.game.definitionOf(p.topCard);
      return (def.kinds as string[]).includes("Digimon");
    })
    .map((p) => p.permanentId);

  if (oppDigimon.length === 0) {
    // No targets: still offer the attack.
  } else {
    const target =
      oppDigimon.length === 1
        ? oppDigimon[0]!
        : (await ctx.ask.chooseTargets(ctx, { candidates: oppDigimon, min: 1, max: 1 }))[0];

    if (target !== undefined) {
      // Base -8000 DP until opponent turn end.
      ctx.fx.modifyDP(target, -8000, EffectDuration.UntilOpponentTurnEnd);

      // Additional -3000 per Lv.5 digivolution card in THIS Digimon's stack.
      const lv5Count = countLv5Stack(ctx);
      if (lv5Count > 0) {
        ctx.fx.modifyDP(target, -3000 * lv5Count, EffectDuration.UntilOpponentTurnEnd);
      }
    }
  }

  // Optional attack.
  const willAttack = await ctx.ask.optional(ctx, "This Digimon may attack.");
  if (willAttack) {
    await ctx.fx.forceAttack(self.permanentId);
  }
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // Static keyword grants: Rush, Raid, Piercing, SecurityAttack +1.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/rush`,
          description: "＜Rush＞",
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self !== undefined) {
              ctx.fx.grantKeyword(self.permanentId, "Rush", EffectDuration.UntilEachTurnEnd);
            }
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/raid`,
          description: "＜Raid＞",
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self !== undefined) {
              ctx.fx.grantKeyword(self.permanentId, "Raid", EffectDuration.UntilEachTurnEnd);
            }
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/piercing`,
          description: "＜Piercing＞",
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self !== undefined) {
              ctx.fx.grantPierce(self.permanentId, EffectDuration.UntilEachTurnEnd);
            }
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/security-attack`,
          description: "＜Security Attack +1＞",
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self !== undefined) {
              ctx.fx.grantKeyword(self.permanentId, "SecurityAttack", EffectDuration.UntilEachTurnEnd, 1);
            }
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/would-leave-play-digivolution-cards`,
          description:
            "[All Turns] When this Digimon would leave the battle area other than by your effects, " +
            "you may play 2 level 5 cards with [Gokuumon] in their texts or [SW] from its " +
            "digivolution cards without paying the costs.",
          when: (_ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeReplacement({
              event: "wouldLeavePlay",
              sourcePermanentId: self.permanentId,
              mode: "instead",
              description: `${cardId}: play up to 2 matching stack cards when leaving`,
              oncePerTurnKey: `${cardId}/would-leave-play-digivolution-cards`,
              causeAllows: (_cause, resolvingSeat) => resolvingSeat !== source.ownerSeat,
              appliesTo: (_subCtx, leavingPermanentId) => leavingPermanentId === self.permanentId,
              apply: async (subCtx) => {
                const stackCandidates = self.stack.filter((card: CardInstance) => {
                  const def = subCtx.game.definitionOf(card);
                  return def.level === 5 && hasGokuumonOrSW(def);
                });
                if (stackCandidates.length === 0) return;
                if (!(await subCtx.ask.optional(subCtx, "Play matching cards from this Digimon's digivolution cards?"))) return;
                const chosen = await subCtx.ask.selectCards(subCtx, {
                  candidates: stackCandidates.map((card) => card.instanceId), min: 0, max: 2,
                });
                if (chosen.length > 0) await subCtx.fx.playInstances(chosen, { payCost: false });
              },
            });
          },
        }),
      ];
    }

    // [On Play]: DP reduction on 1 opponent Digimon + optional attack.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-dp-attack`,
          description:
            "[On Play] 1 opponent Digimon gets -8000 DP (and -3000 DP per Lv.5 digivolution card " +
            "this Digimon has) until opponent's turn end. This Digimon may attack.",
          resolve: dpAndAttack,
        }),
      ];
    }

    // [When Digivolving]: same as On Play.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-dp-attack`,
          description:
            "[When Digivolving] 1 opponent Digimon gets -8000 DP (and -3000 DP per Lv.5 digivolution " +
            "card this Digimon has) until opponent's turn end. This Digimon may attack.",
          resolve: dpAndAttack,
        }),
      ];
    }

    return [];
  },
};

// Expose the helper for test inspection (not part of the public EffectModule contract).
export { hasGokuumonOrSW };

registerCard(module);
export default module;
