import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { CardDefinition, CardInstance } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onDeletion, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT17-068 — Mephistomon (BT17, Purple Lv.5 Digimon).
 *
 *
 * Effects:
 *   [Static] While this card is revealed from your deck, also treated as level 6.
 *   [When Would Be Played] By returning 1 [Apocalymon] from your trash to the bottom of
 *     the deck, reduce the play cost by 3.
 *     (Handled by the IR Replacement/wouldBePlayed — kept in the IR path below.)
 *   [On Deletion] If deleted by an effect, you may play 1 [Gulfmon] or 1 level 6 Digimon
 *     with the [Dark Masters] trait from your hand or trash without paying cost.
 *   [Inherited][When Attacking][Once Per Turn] By placing 1 level 5 or lower card
 *     with [Dark Masters] in its text from your trash as this Digimon's bottom
 *     digivolution card, this Digimon gets +2000 DP for the turn.
 *
 * KB Q2828: DP-reduction deletion → deleted by RULES, not by effect → [On Deletion] should
 *   NOT trigger. Cannot gate this in the current engine (no cause in TriggerInfo).
 * KB Q2829: the inherited [When Attacking] targets level 5 or lower cards with [Dark
 *   Masters] in their TEXT (not just trait).
 */

const cardId = "BT17-068";

const isGulfmon = (def: CardDefinition): boolean => def.nameEn === "Gulfmon";

const isDarkMastersLevel6Digimon = (def: CardDefinition): boolean =>
  (def.kinds as string[]).includes("Digimon") &&
  def.level === 6 &&
  ((def.types as string[] | undefined)?.includes("Dark Masters") ?? false);

const isDarkMastersInText = (def: CardDefinition): boolean =>
  def.level !== undefined && def.level <= 5 && (def.effectText?.includes("Dark Masters") ?? false);

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [On Deletion] You may play 1 [Gulfmon] or 1 level 6 Dark Masters Digimon from
    // hand or trash without paying cost.
    if (timing === EffectTiming.OnDestroyedAnyone) {
      return [
        onDeletion({
          source,
          effectKey: `${cardId}/on-deletion-play-gulfmon-dark-masters`,
          description:
            "[On Deletion] If deleted by an effect, you may play 1 [Gulfmon] or 1 level 6 " +
            "Digimon with the [Dark Masters] trait from your hand or trash without paying cost.",
          optional: true,
          canActivate: (ctx) => {
            if (ctx.trigger?.removalCause !== "byEffect") return false;
            const owner = ctx.game.player(source.ownerSeat);
            const matchFn = (c: CardInstance): boolean => {
              const def = ctx.game.definitionOf(c);
              return isGulfmon(def) || isDarkMastersLevel6Digimon(def);
            };
            return Array.from(owner.hand).some(matchFn) || Array.from(owner.trash).some(matchFn);
          },
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const matchFn = (c: CardInstance): boolean => {
              const def = ctx.game.definitionOf(c);
              return isGulfmon(def) || isDarkMastersLevel6Digimon(def);
            };
            const candidates = [
              ...Array.from(owner.hand).filter(matchFn),
              ...Array.from(owner.trash).filter(matchFn),
            ].map((c) => c.instanceId);
            if (candidates.length === 0) return;
            const chosen = await ctx.ask.selectCards(ctx, { candidates, min: 0, max: 1 });
            if (chosen.length === 0) return;
            await ctx.fx.playInstances(chosen, { payCost: false });
          },
        }),
      ];
    }

    // [Inherited][When Attacking][Once Per Turn] By placing 1 level 5 or lower card
    // with [Dark Masters] in its text from your trash as this Digimon's bottom
    // digivolution card, this Digimon gets +2000 DP for the turn.
    if (timing === EffectTiming.OnAllyAttack) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/inherited-when-attacking-place-dark-masters`,
          description:
            "[Inherited][When Attacking][Once Per Turn] By placing 1 level 5 or lower card " +
            "with [Dark Masters] in its text from your trash as this Digimon's bottom " +
            "digivolution card, this Digimon gets +2000 DP for the turn.",
          optional: true,
          isInherited: true,
          maxPerTurn: 1,
          when: (ctx) => ctx.source.isOnBattleArea(),
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const owner = ctx.game.player(source.ownerSeat);
            return Array.from(owner.trash).some((c) => isDarkMastersInText(ctx.game.definitionOf(c)));
          },
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (!self) return;
            const owner = ctx.game.player(source.ownerSeat);
            const candidates = Array.from(owner.trash)
              .filter((c) => isDarkMastersInText(ctx.game.definitionOf(c)))
              .map((c) => c.instanceId);
            if (candidates.length === 0) return;
            const chosen = await ctx.ask.selectCards(ctx, { candidates, min: 0, max: 1 });
            if (chosen.length === 0) return;
            await ctx.fx.placeUnder(self.permanentId, chosen);
            ctx.fx.modifyDP(self.permanentId, 2000, EffectDuration.UntilEachTurnEnd);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
