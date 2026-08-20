import { CardKind, EffectTiming } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { canDigivolveOnto } from "../../engine/cards/cardData.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT14-006 — Bowmon (BT14, Purple Lv.2 DigiEgg).
 *
 * and cards.json); behavior is modeled from the printed text and KB rulings.
 *
 * Inherited effect text (cards.json):
 *   "[Your Turn] When a Digimon card with the [Dark Animal] or [SoC] trait is trashed
 *    from your hand, this Digimon may digivolve into that card."
 *
 * KB rulings (binding):
 *   Q2370: Breeding-area Digimon are NOT valid hosts for this effect.
 *   Q2371: Digivolution requirements must still be met (NOT ignored).
 *   Q2372: Digivolution cost must be paid (NOT free).
 *
 *   The "YourTurn" + SubTrigger(whenHandTrashed) pattern (like BT14-071's ESS) maps to
 *   EffectTiming.None (continuous/static) + subscribeSubTrigger("whenHandTrashed").
 *   The static resolve installs the watcher; `continuousOpt()` in primitives stamps it as
 *   a continuous subscription, so the recompute clears and re-derives it without duplication.
 *
 * Limitation: `whenHandTrashed` carries only the affected seat, not the specific trashed
 * cards. The body searches the owner's trash for qualifying [Dark Animal]/[SoC] Digimon
 * with a legal EvoCost for the current host, which covers the common case and is correct
 * in the vast majority of situations (the card that was just trashed will be in trash).
 */
const cardId = "BT14-006";

const isDarkAnimalOrSoC = (def: CardDefinition): boolean => {
  // CardTraits = forms ∪ attributes ∪ types (documented behavior).
  const traits = [...(def.types ?? []), ...(def.forms ?? []), ...(def.attributes ?? [])];
  return traits.includes("Dark Animal") || traits.includes("SoC");
};

const isDigimon = (def: CardDefinition): boolean =>
  (def.kinds as CardKind[]).includes(CardKind.Digimon);

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Your Turn] inherited ESS: install a whenHandTrashed watcher.
    // The static (None) timing installs the subscription via the continuous recompute.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/ess-when-hand-trashed-digivolve`,
          description:
            "[ESS][Your Turn] When a Digimon card with the [Dark Animal] or [SoC] trait is " +
            "trashed from your hand, this Digimon may digivolve into that card " +
            "(paying cost; with requirements; not in breeding — Q2370/Q2371/Q2372).",
          isInherited: true,
          resolve: async (ctx) => {
            // Install a whenHandTrashed watcher on the hosting permanent.
            const self = ctx.source.permanent();
            if (self === undefined) return;
            // Q2370: only active when the host is on the battle area (not breeding).
            if (self.inBreeding) return;
            if (self.topCard === undefined) return;

            ctx.fx.subscribeSubTrigger({
              event: "whenHandTrashed",
              sourcePermanentId: self.permanentId,
              once: false,
              description:
                `${cardId}/ess: digivolve into a trashed [Dark Animal]/[SoC] Digimon`,
              matches: (subCtx) => {
                // Gate: only fire when the OWNER's hand was trashed from (not opponent's).
                return subCtx.trigger?.handTrashedSeat === source.ownerSeat;
              },
              run: async (subCtx) => {
                // Re-resolve the host — the permanent may have left the field by now.
                const host = subCtx.source.permanent();
                if (host === undefined || host.topCard === undefined) return;
                // Q2370: host must be on the battle area.
                if (host.inBreeding) return;

                const hostDef = subCtx.game.definitionOf(host.topCard);
                const ownerTrash = subCtx.game.player(source.ownerSeat).trash;

                // The event identifies the exact hand card trashed by this effect. Do not
                // offer an older qualifying card already in trash (the effect refers to the
                // card that was just trashed).
                const trashedInstanceId = subCtx.trigger.trashedFromHandInstanceId;
                const trashed = ownerTrash.find((c) => c.instanceId === trashedInstanceId);
                const candidates = trashed === undefined ? [] : [trashed].filter((c) => {
                  const def = subCtx.game.definitionOf(c);
                  return isDigimon(def) && isDarkAnimalOrSoC(def) && canDigivolveOnto(def, hostDef);
                });

                if (candidates.length === 0) return;

                // Optional: the controller may decline (Q2372: they must PAY, not that they must DO).
                const willDigivolve = await subCtx.ask.optional(
                  subCtx,
                  "Digivolve this Digimon into a [Dark Animal]/[SoC] Digimon from your trash? (pay cost, with requirements)",
                );
                if (!willDigivolve) return;

                const picks = await subCtx.ask.selectCards(subCtx, {
                  candidates: candidates.map((c) => c.instanceId),
                  min: 1,
                  max: 1,
                });
                if (picks.length === 0) return;

                // Q2372: must pay the digivolution cost (payCost: true).
                await subCtx.fx.digivolveFromInstance(
                  host.permanentId,
                  picks[0]!,
                  { payCost: true },
                );
              },
            });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
