import { CardKind, CardColor, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT14-093 — Emissary of Hope (BT14, Yellow Option).
 *
 * Authoritative text:
 *   [Main] Search your security stack. 1 of your Digimon may digivolve into
 *     1 yellow level 6 or lower Digimon card with the [Vaccine] trait among them
 *     without paying the cost. Then, shuffle your security stack. If digivolved
 *     by this effect, and you have a Tamer with [T.K. Takaishi] in its name,
 *     ＜Recovery +1 (Deck)＞.
 *   [Security] You may play 1 [Patamon] from your hand or trash without paying
 *     the cost. Add this card to your hand.
 *
 * KB rulings (binding):
 *   Q2468: You may search security and then choose NOT to digivolve.
 *   Q2469: Digivolution bonus draw occurs when the card is stacked; this effect
 *          resolves in full before [When Digivolving] of the new card triggers.
 *   Q2470: [When Digivolving] of the digivolved-into card cannot activate before
 *          processing the "then shuffle" tail of this effect.
 *   Q4176: The [Your Turn] effects of this card (in context of BT14-093 as a tamer
 *          effect) cannot fire while this effect is checking security.
 */
const cardId = "BT14-093";

const isYellowVaccineDigimonLv6OrLower = (def: CardDefinition): boolean => {
  if (!isDigimon(def)) return false;
  if (def.level !== undefined && def.level > 6) return false;
  if (!(def.colors as string[]).includes(CardColor.Yellow)) return false;
  const traits = [...(def.types ?? []), ...(def.forms ?? []), ...(def.attributes ?? [])];
  return traits.includes("Vaccine");
};

const hasTKTakaishiTamer = (ctx: EffectContext, ownerSeat: 0 | 1): boolean => {
  return ctx.game.player(ownerSeat).battleArea.some((p) => {
    if (p.inBreeding || p.topCard === undefined) return false;
    const def = ctx.game.definitionOf(p.topCard);
    if (!(def.kinds as CardKind[]).includes(CardKind.Tamer)) return false;
    return def.nameEn.includes("T.K. Takaishi");
  });
};

const isPatamonCard = (def: CardDefinition): boolean =>
  def.nameEn.includes("Patamon");

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Main] — search security, optionally digivolve, shuffle, conditional Recovery.
    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-search-digivolve`,
          description:
            "[Main] Search security, optionally digivolve into yellow Lv.6 or lower " +
            "[Vaccine] card without paying cost, shuffle security. If digivolved and " +
            "you have a [T.K. Takaishi] Tamer, ＜Recovery +1 (Deck)＞.",
          optional: false,
          resolve: async (ctx) => {
            const ownerSeat = source.ownerSeat;
            const ownerPlayer = ctx.game.player(ownerSeat);
            const security = ownerPlayer.security;

            // Collect yellow Lv.6 or lower Vaccine Digimon from security stack.
            const securityCandidates = security.filter((c) =>
              isYellowVaccineDigimonLv6OrLower(ctx.game.definitionOf(c)),
            );

            // Find a battle-area Digimon of the controller to digivolve.
            const myDigimon = ownerPlayer.battleArea.filter((p) => {
              if (p.inBreeding || p.topCard === undefined) return false;
              return isDigimon(ctx.game.definitionOf(p.topCard));
            });

            let digivolvedByEffect = false;

            if (securityCandidates.length > 0 && myDigimon.length > 0) {
              const willDigivolve = await ctx.ask.optional(
                ctx,
                "Digivolve 1 of your Digimon into a yellow Lv.6 or lower [Vaccine] from security without cost?",
              );

              if (willDigivolve) {
                // Choose which Digimon to digivolve.
                const hostPicks = await ctx.ask.chooseTargets(ctx, {
                  candidates: myDigimon.map((p) => p.permanentId),
                  min: 1,
                  max: 1,
                });

                // Choose which security card to digivolve into.
                const cardPicks = await ctx.ask.selectCards(ctx, {
                  candidates: securityCandidates.map((c) => c.instanceId),
                  min: 1,
                  max: 1,
                });

                if (hostPicks.length > 0 && cardPicks.length > 0) {
                  const result = await ctx.fx.digivolveFromInstance(
                    hostPicks[0]!,
                    cardPicks[0]!,
                    { payCost: false },
                  );
                  if (result !== undefined) {
                    digivolvedByEffect = true;
                  }
                }
              }
            }

            // Shuffle the security stack regardless (Q2468: even when no digivolve occurred).
            // This also re-hides any cards revealed while searching security.
            ctx.fx.shuffleSecurity(ownerSeat);

            // Conditional <Recovery +1 (Deck)>: digivolved by this effect AND T.K. Takaishi in play.
            if (digivolvedByEffect && hasTKTakaishiTamer(ctx, ownerSeat)) {
              await ctx.fx.recoverToSecurity(ownerSeat, 1);
            }
          },
        }),
      ];
    }

    // [Security] Play 1 [Patamon] from hand or trash without cost. Add this card to hand.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play-patamon`,
          description:
            "[Security] You may play 1 [Patamon] from your hand or trash without paying " +
            "the cost. Add this card to your hand.",
          optional: false,
          resolve: async (ctx) => {
            const ownerSeat = source.ownerSeat;
            const ownerPlayer = ctx.game.player(ownerSeat);

            const handCandidates = ownerPlayer.hand.filter((c) =>
              isPatamonCard(ctx.game.definitionOf(c)),
            );
            const trashCandidates = ownerPlayer.trash.filter((c) =>
              isPatamonCard(ctx.game.definitionOf(c)),
            );
            const candidates = [...handCandidates, ...trashCandidates];

            if (candidates.length > 0) {
              const picks = await ctx.ask.selectCards(ctx, {
                candidates: candidates.map((c) => c.instanceId),
                min: 0,
                max: 1,
              });
              if (picks.length > 0) {
                await ctx.fx.playInstances(picks, { payCost: false });
              }
            }

            // Add this card (the security Option) to hand.
            await ctx.fx.returnToHand([source.instanceId]);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
