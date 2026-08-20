import { CardColor, EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, turnTiming, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT11-089 — Satsuki Tamahime (BT11, Purple Tamer).
 *
 *
 * Printed text (no errata):
 *   [On Play] Reveal the top 4 cards of your deck. Add 1 red Digimon with [Vaccine]
 *   in its traits among them to your hand. Place the rest at the bottom of your deck
 *   in any order.
 *   [Your Turn] When you play a red Digimon with [Avian], [Bird], [Beast], [Animal],
 *   or [Sovereign] in its traits (except [Sea Animal]), by suspending this Tamer, that
 *   Digimon gains ＜Rush＞ for the turn.
 *   [Security] Play this card without paying its memory cost.
 */
const cardId = "BT11-089";

function traitSetOf(def: { types?: string[]; forms?: string[]; attributes?: string[] }): string[] {
  return [...(def.types ?? []), ...(def.forms ?? []), ...(def.attributes ?? [])];
}

function hasRedVaccineDigimon(def: {
  colors?: string[];
  types?: string[];
  forms?: string[];
  attributes?: string[];
}): boolean {
  return (
    ((def.colors as CardColor[] | undefined)?.includes(CardColor.Red) ?? false) &&
    traitSetOf(def).includes("Vaccine")
  );
}

function isBirdBeastEtc(def: { types?: string[]; forms?: string[]; attributes?: string[] }): boolean {
  const traits = traitSetOf(def);
  if (traits.length === 0) return false;
  const matching = ["Avian", "Bird", "Beast", "Animal", "Sovereign"];
  const hasMatch = matching.some((t) => traits.includes(t));
  const hasSeaAnimal = traits.includes("Sea Animal");
  return hasMatch && !hasSeaAnimal;
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [On Play] Reveal top 4, add 1 red Vaccine Digimon, rest to bottom.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-reveal`,
          description:
            "[On Play] Reveal the top 4 cards of your deck. Add 1 red Digimon with [Vaccine] " +
            "in its traits among them to your hand. Place the rest at the bottom of your deck " +
            "in any order.",
          optional: false,
          canActivate: (ctx: any) => {
            return ctx.game.player(source.ownerSeat).deck.length >= 1;
          },
          resolve: async (ctx: any) => {
            const revealed = await ctx.fx.reveal(source.ownerSeat, 4);
            const candidates = revealed
              .filter((c: any) => hasRedVaccineDigimon(ctx.game.definitionOf(c)))
              .map((c: any) => c.instanceId);

            let selected: string[] = [];
            if (candidates.length > 0) {
              selected = await ctx.ask.selectCards(ctx, {
                candidates,
                min: 1,
                max: 1,
              });
            }

            if (selected.length > 0) {
              await ctx.fx.returnToHand(selected);
            }

            const rest = revealed
              .filter((c: any) => !selected.includes(c.instanceId))
              .map((c: any) => c.instanceId);

            if (rest.length > 0) {
              await ctx.fx.returnToDeck(rest, { toTop: false });
            }
          },
        }),
      ];
    }

    // [Your Turn] When playing a red Digimon with those traits, suspend this Tamer
    // to grant ＜Rush＞ for the turn.
    if (timing === EffectTiming.None) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/grant-rush`,
          description:
            "[Your Turn] When you play a red Digimon with [Avian]/[Bird]/[Beast]/[Animal]/" +
            "[Sovereign] in its traits, by suspending this Tamer, that Digimon gains ＜Rush＞ " +
            "for the turn.",
          optional: true,
          when: (_ctx) => source.isOnBattleArea() && source.isOwnersTurn(),
          resolve: async (ctx) => {
            const me = source.permanent();
            if (me === undefined) return;

            const owner = ctx.game.player(source.ownerSeat);
            const eligibleDigimon = owner.battleArea.filter((p) => {
              if (p.topCard === undefined) return false;
              const def = ctx.game.definitionOf(p.topCard);
              return (
                isDigimon(def) &&
                isBirdBeastEtc(def) &&
                def.colors.includes(CardColor.Red)
              );
            });

            if (eligibleDigimon.length === 0) return;

            const ids = eligibleDigimon.map((p) => p.permanentId);
            const selected = await ctx.ask.selectPermanents(ctx, {
              candidates: ids,
              min: 1,
              max: 1,
            });

            const [target] = selected;
            if (target === undefined) return;

            const paid = ctx.fx.payActivationCost?.(me.permanentId, "suspend");
            if (paid === false) return;

            ctx.fx.grantKeyword(target, "Rush", EffectDuration.UntilEachTurnEnd);
          },
        }),
      ];
    }

    // [Security] Play this card without paying its memory cost.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play-self`,
          description: "[Security] Play this card without paying its memory cost.",
          optional: false,
          resolve: async (ctx) => {
            await ctx.fx.playInstances([source.instanceId], { payCost: false });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
