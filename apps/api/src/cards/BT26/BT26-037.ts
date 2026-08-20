import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, whenDigivolving, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { cardHasTrait } from "../../engine/cards/cardData.js";

/**
 * BT26-037 — Weatherdramon (BT26, Green Lv.4 Digimon).
 *
 * The committed KB contains Q7014-Q7017 (2026-08-18): linked candidates must print
 * <Link>, "may battle" starts a standard battle even against an effect-immune Digimon,
 * and any ordered pair of two distinct listed names satisfies the three-name App Fusion.
 *
 * Printed text:
 *   [App Fusion] [Weathermon] & [Rocketmon] & [Newsmon]: Cost 0
 *   [Assembly -2] Lv.3 [Navi]/[System]/[Seven Code] trait Digimon card
 *   ＜Blocker＞
 *   ＜Detach ([Seven Code] trait)＞
 *   [On Play] [When Digivolving] You may link 1 level 3 Digimon card with the [Navi],
 *     [System] or [Seven Code] trait from this Digimon's digivolution cards to this
 *     Digimon without paying the cost.
 *   (link face) [When Linking] This Digimon may battle 1 of your opponent's Digimon.
 *
 * Clause mapping: identical shape to its sibling BT26-028 (Medicmon) — see that file's
 * header for the full rationale. This card grants ＜Blocker＞ instead of ＜Barrier＞, and
 * the link-eligible traits are [Navi]/[System]/[Seven Code] instead of [Life]/[System]/
 * [Seven Code].
 *
 * The linked face is a linked-only continuous watcher on `whenLinked`.
 * `linkedCardInstanceIds` binds it to the same operation that linked this Weatherdramon;
 * `forceBattle` then performs Q7015/Q7016's immediate standard rules battle without an
 * attack declaration or effect-immunity gate.
 *
 * ＜Detach ([Seven Code] trait)＞ is handled by the shared pre-battle-deletion Detach
 * window, including eligible-link selection, ordinary trash events, and one-sided prevention.
 *
 * [App Fusion] and [Assembly -2] are structural play-legality data, not EffectModule
 * clauses. Both are exposed through shared overrides because BT26 is absent from the
 * historical compiled effects artifact.
 */
const cardId = "BT26-037";

function linkEligibleTrait(def: CardDefinition): boolean {
  return cardHasTrait(def, "Navi") || cardHasTrait(def, "System") || cardHasTrait(def, "Seven Code");
}

function hasLinkRequirement(def: CardDefinition): boolean {
  const requirement = def.linkRequirement?.trim();
  return requirement !== undefined && requirement.length > 0 && requirement !== "-";
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/blocker`,
          description: "＜Blocker＞",
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self !== undefined) ctx.fx.grantKeyword(self.permanentId, "Blocker", EffectDuration.UntilEachTurnEnd);
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/link-face-when-linking-battle`,
          description: "[When Linking] This Digimon may battle 1 of your opponent's Digimon.",
          isLinked: true,
          resolve: async (ctx) => {
            const host = ctx.source.permanent();
            if (host === undefined) return;
            const hostId = host.permanentId;
            ctx.fx.subscribeSubTrigger({
              event: "whenLinked",
              sourcePermanentId: hostId,
              once: false,
              description: `${cardId}: linked face [When Linking] may battle an opponent Digimon.`,
              matches: (subCtx) => subCtx.trigger?.linkedCardInstanceIds?.includes(source.instanceId) === true,
              run: async (subCtx) => {
                const opponent = subCtx.game.player(subCtx.game.opponentOf(source.ownerSeat));
                const candidates = opponent.battleArea
                  .filter((permanent) => {
                    if (permanent.inBreeding || permanent.topCard === undefined) return false;
                    return isDigimon(subCtx.game.definitionOf(permanent.topCard));
                  })
                  .map((permanent) => permanent.permanentId);
                if (candidates.length === 0) return;
                if (!(await subCtx.ask.optional(subCtx, "Battle 1 of your opponent's Digimon?"))) return;
                const chosen =
                  candidates.length === 1
                    ? candidates[0]!
                    : (await subCtx.ask.chooseTargets(subCtx, { candidates, min: 1, max: 1 }))[0];
                if (chosen !== undefined) await subCtx.fx.forceBattle?.(hostId, chosen);
              },
            });
          },
        }),
      ];
    }

    // [On Play] / [When Digivolving] You may link 1 level 3 Digimon card with the [Navi],
    // [System] or [Seven Code] trait from this Digimon's digivolution cards to this
    // Digimon without paying the cost.
    const resolveLink = async (ctx: import("../../engine/effects/EffectContext.js").EffectContext): Promise<void> => {
      const self = ctx.source.permanent();
      if (self === undefined) return;
      const candidates = self.stack.filter((c) => {
        const def = ctx.game.definitionOf(c);
        return isDigimon(def) && def.level === 3 && linkEligibleTrait(def) && hasLinkRequirement(def);
      });
      if (candidates.length === 0) return;
      const candidateIds = candidates.map((c) => c.instanceId);
      const picked = await ctx.ask.selectCards(ctx, { candidates: candidateIds, min: 0, max: 1 });
      if (picked.length === 0) return;
      await ctx.fx.link(self.permanentId, picked);
    };

    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-link`,
          description:
            "[On Play] [When Digivolving] You may link 1 level 3 Digimon card with the " +
            "[Navi], [System] or [Seven Code] trait from this Digimon's digivolution " +
            "cards to this Digimon without paying the cost.",
          optional: false,
          resolve: resolveLink,
        }),
      ];
    }

    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-link`,
          description:
            "[On Play] [When Digivolving] You may link 1 level 3 Digimon card with the " +
            "[Navi], [System] or [Seven Code] trait from this Digimon's digivolution " +
            "cards to this Digimon without paying the cost.",
          optional: false,
          resolve: resolveLink,
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
