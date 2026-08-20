import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, whenDigivolving, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { cardHasTrait } from "../../engine/cards/cardData.js";

/**
 * BT26-028 — Medicmon (BT26, Yellow Lv.4 Digimon).
 *
 * The committed KB contains Q6987-Q6993, covering Link-requirement legality, the exact
 * When Digivolving suppression boundary, OPT non-consumption, and all six App Fusion pairs.
 *
 * Printed text:
 *   [App Fusion] [Aidmon] & [Supplemon] & [Spamon]: Cost 0
 *   [Assembly -2] Lv.3 [Life]/[System]/[Seven Code] trait Digimon card
 *   ＜Barrier＞
 *   ＜Detach ([Seven Code] trait)＞
 *   [On Play] [When Digivolving] You may link 1 level 3 Digimon card with the [Life],
 *     [System] or [Seven Code] trait from this Digimon's digivolution cards to this
 *     Digimon without paying the cost.
 *   (link face) [When Linking] Until your opponent's turn ends, 1 of their Digimon
 *     can't activate [When Digivolving] effects and gets -3000 DP.
 *
 * Clause mapping:
 *   EffectTiming.None — ＜Barrier＞ static grant (`hasKeyword` on the continuous ledger
 *     is what combat legality reads, not the printed-text scan — BT5-085/BT12-063
 *     precedent).
 *   EffectTiming.OnPlay / EffectTiming.WhenDigivolving — "You may link 1 level 3 Digimon
 *     card with the [Life], [System] or [Seven Code] trait from this Digimon's
 *     digivolution cards to this Digimon without paying the cost." Modeled on EX11-073's
 *     `self.stack.filter(...)` + `ctx.fx.link(self.permanentId, chosen)` shape.
 *   EffectTiming.None (`isLinked: true`) — installs a `whenLinked` watcher on the host.
 *     `linkedCardInstanceIds` restricts it to the operation that linked this Medicmon,
 *     so it participates in that same immediate window but not later unrelated links.
 *
 * ＜Detach ([Seven Code] trait)＞ is resolved centrally immediately before battle deletion:
 * the controller may trash an eligible linked [Seven Code] card to prevent this Digimon's
 * battle deletion. The shared combat path preserves the linked-trash events and Q6964 ordering.
 *
 * [App Fusion] and [Assembly -2] are structural play-legality data. Their BT26 overrides
 * live in shared effects/data.ts and are enforced by appFuseInto / the Assembly play action.
 */
const cardId = "BT26-028";

function linkEligibleTrait(def: CardDefinition): boolean {
  return cardHasTrait(def, "Life") || cardHasTrait(def, "System") || cardHasTrait(def, "Seven Code");
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
          effectKey: `${cardId}/barrier`,
          description: "＜Barrier＞",
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self !== undefined) ctx.fx.grantKeyword(self.permanentId, "Barrier", EffectDuration.UntilEachTurnEnd);
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/link-face-when-linking-lock-dp`,
          description:
            "[When Linking] Until your opponent's turn ends, 1 of their Digimon can't " +
            "activate [When Digivolving] effects and gets -3000 DP.",
          isLinked: true,
          resolve: async (ctx) => {
            const host = ctx.source.permanent();
            if (host === undefined) return;
            const hostId = host.permanentId;
            ctx.fx.subscribeSubTrigger({
              event: "whenLinked",
              sourcePermanentId: hostId,
              once: false,
              description: `${cardId}: linked face [When Linking] lock evolution effects and -3000 DP.`,
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
                const chosen =
                  candidates.length === 1
                    ? candidates[0]!
                    : (await subCtx.ask.chooseTargets(subCtx, { candidates, min: 1, max: 1 }))[0];
                if (chosen === undefined) return;
                subCtx.fx.restrict(chosen, "cannotActivateWhenDigivolving", EffectDuration.UntilOpponentTurnEnd);
                subCtx.fx.modifyDP(chosen, -3000, EffectDuration.UntilOpponentTurnEnd);
              },
            });
          },
        }),
      ];
    }

    // [On Play] / [When Digivolving] You may link 1 level 3 Digimon card with the [Life],
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
            "[Life], [System] or [Seven Code] trait from this Digimon's digivolution " +
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
            "[Life], [System] or [Seven Code] trait from this Digimon's digivolution " +
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
