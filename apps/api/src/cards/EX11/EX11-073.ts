import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { whenDigivolving, turnTiming, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * EX11-073 — ExMaquinamon (EX11, Multi-Color Lv.7 Digimon).
 *
 * [Static] ＜Security Attack +1＞, ＜Blocker＞, ＜Link +2＞ (grantLinkMax +2)
 * [When Digivolving] if DNA Digivolving:
 *   Link up to 3 [Maquinamon] cards from your hand, trash, or this Digimon's digivolution
 *   cards without paying the cost.
 * [End of Opponent's Turn][Once Per Turn]:
 *   For each link card, trash 1 of your opponent's top security cards AND return 1 of your
 *   opponent's Digimon to the bottom of their deck.
 *
 * RESIDUAL: none — all non-DNA clauses are implementable. The DNA check uses ctx.trigger.isDnaDigivolve.
 * The [End of Opponent's Turn] uses OnEndTurn timing gated on !isOwnersTurn().
 */
const cardId = "EX11-073";

function hasMaquinamonInText(def: CardDefinition): boolean {
  const token = "maquinamon";
  const haystacks = [def.nameEn, def.effectText, def.inheritedEffectText, ...(def.types ?? [])];
  return haystacks.some((t) => t !== undefined && t.toLowerCase().includes(token));
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // ＜Security Attack +1＞, ＜Blocker＞, and ＜Link +2＞ static grants.
    if (timing === EffectTiming.None) {
      return [
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
          effectKey: `${cardId}/blocker`,
          description: "＜Blocker＞",
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self !== undefined) {
              ctx.fx.grantKeyword(self.permanentId, "Blocker", EffectDuration.UntilEachTurnEnd);
            }
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/link-max`,
          description: "＜Link +2＞ — adds 2 to this Digimon's maximum links.",
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self !== undefined) {
              ctx.fx.grantLinkMax(self.permanentId, 2, EffectDuration.UntilEachTurnEnd);
            }
          },
        }),
      ];
    }

    // [When Digivolving] if DNA Digivolving:
    //   Link up to 3 [Maquinamon] cards from hand/trash/this Digimon's digivolution cards.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-link-maquinamon`,
          description:
            "[When Digivolving] If DNA Digivolving, link up to 3 [Maquinamon] cards from your " +
            "hand, trash, or this Digimon's digivolution cards without paying the cost.",
          optional: true,
          canActivate: (ctx) => ctx.trigger.isDnaDigivolve === true,
          resolve: async (ctx) => {
            if (ctx.trigger.isDnaDigivolve !== true) return;

            const self = ctx.source.permanent();
            if (self === undefined) return;

            const seat = ctx.source.ownerSeat;
            const player = ctx.game.player(seat);

            // Gather candidates from hand, trash, and this Digimon's digivolution cards.
            const handCandidates = Array.from(player.hand).filter((c) =>
              hasMaquinamonInText(ctx.game.definitionOf(c)),
            );
            const trashCandidates = Array.from(player.trash).filter((c) =>
              hasMaquinamonInText(ctx.game.definitionOf(c)),
            );
            const stackCandidates = self.stack.filter((c) =>
              hasMaquinamonInText(ctx.game.definitionOf(c)),
            );

            const allCandidates = [...handCandidates, ...trashCandidates, ...stackCandidates];

            if (allCandidates.length === 0) return;

            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: allCandidates.map((c) => c.instanceId),
              min: 0,
              max: Math.min(3, allCandidates.length),
            });

            if (chosen.length === 0) return;

            await ctx.fx.link(self.permanentId, chosen);
          },
        }),
      ];
    }

    // [End of Opponent's Turn][Once Per Turn]:
    //   For each link card, trash 1 opponent's top security + return 1 opponent Digimon to deck bottom.
    if (timing === EffectTiming.OnEndTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/end-opp-turn-link-payoff`,
          description:
            "[End of Opponent's Turn][Once Per Turn] For each of this Digimon's link cards, " +
            "trash 1 of your opponent's top security cards and return 1 of your opponent's " +
            "Digimon to the bottom of their deck.",
          maxPerTurn: 1,
          when: (ctx) => ctx.source.isOnBattleArea() && !ctx.source.isOwnersTurn(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;

            const linkCount = self.linked.length;
            if (linkCount === 0) return;

            const opponentSeat = ctx.game.opponentOf(ctx.source.ownerSeat);

            // Trash N top security cards from opponent.
            await ctx.fx.trashFromSecurity(opponentSeat, linkCount);

            // Return N opponent Digimon to the bottom of their deck.
            const oppDigimon = ctx.game
              .player(opponentSeat)
              .battleArea.filter((p) => {
                if (p.topCard === undefined) return false;
                const def = ctx.game.definitionOf(p.topCard);
                return (def.kinds as string[]).includes("Digimon");
              });

            if (oppDigimon.length === 0) return;

            const toReturn = oppDigimon.slice(0, linkCount);

            // For each opponent Digimon to return, ask the player to choose.
            const returnCount = Math.min(linkCount, oppDigimon.length);
            let returnTargetIds: string[];
            if (oppDigimon.length <= returnCount) {
              returnTargetIds = oppDigimon.map((p) => p.permanentId);
            } else {
              returnTargetIds = await ctx.ask.chooseTargets(ctx, {
                candidates: oppDigimon.map((p) => p.permanentId),
                min: returnCount,
                max: returnCount,
              });
            }
            void toReturn; // consumed via returnTargetIds logic above

            // returnToDeck expects instance ids (the top card instances of the permanents).
            const instanceIds: string[] = [];
            for (const pid of returnTargetIds) {
              const perm = ctx.game.permanentById(pid);
              if (perm?.topCard !== undefined) {
                instanceIds.push(perm.topCard.instanceId);
              }
            }

            if (instanceIds.length > 0) {
              await ctx.fx.returnToDeck(instanceIds, { toTop: false });
            }
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
