import { CardKind, EffectTiming } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { canDigivolveOntoWithAlternates, cardHasTrait } from "../../engine/cards/cardData.js";
import { onPlay, staticModifier, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-035 — Morphomon (BT26, Green Lv.3 Digimon).
//
// Provisional port: no KB entry (errata/Q&A) exists yet for BT26-035 as of this port
// (`node tools/kb/query.mjs card BT26-035` returned no knowledge-base entries). Implemented
// from the printed card text only.
//
// [Digivolve] Lv.2 w/[NSp] trait: Cost 0 — a digivolution-cost requirement, not an effect
//   clause; already carried by CardDefinition.evoCosts in cards.json and read directly by
//   the engine's digivolution logic, so it needs no entry here.
// [When Moving] [On Play] You may suspend 1 Digimon.
// Inherited: [Your Turn] [Once Per Turn] When this Digimon wins a battle, 1 of your
//   [Insectoid]/[NSp] Digimon may digivolve into a matching card in hand for 1 less.
//
// Shape follows BT26-038's shared-resolver idiom for the same paired [When Moving]/[On Play]
// windows (one resolve function; the OnMove entry gated by `isSelfMove`) and its
// "You may suspend 1 Digimon" targeting — any Digimon on either side of the battle area,
// the printed text puts no ownership or state restriction on the target.

const cardId = "BT26-035";

const isDigimon = (def: CardDefinition): boolean => def.kinds?.includes(CardKind.Digimon) === true;

const hasInsectoidOrNsp = (def: CardDefinition): boolean => cardHasTrait(def, "Insectoid") || cardHasTrait(def, "NSp");

/** Every Digimon on the battle area, either seat. Breeding-area Digimon are not targetable. */
function suspendableDigimon(ctx: EffectContext): string[] {
  const targets: string[] = [];
  for (const seat of [0, 1] as const) {
    for (const permanent of ctx.game.player(seat).battleArea) {
      if (permanent.inBreeding) continue;
      if (permanent.topCard === undefined) continue;
      if (!isDigimon(ctx.game.definitionOf(permanent.topCard))) continue;
      targets.push(permanent.permanentId);
    }
  }
  return targets;
}

/** "You may suspend 1 Digimon." — shared by the [On Play] and [When Moving] windows. */
async function suspendOneDigimon(ctx: EffectContext): Promise<void> {
  const candidates = suspendableDigimon(ctx);
  if (candidates.length === 0) return;

  const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 0, max: 1 });
  if (chosen.length === 0) return;

  await ctx.fx.suspend(chosen);
}

/** Whether this card is the permanent that just moved from breeding to the battle area. */
function isSelfMove(ctx: EffectContext, source: CardSource): boolean {
  const movedId = ctx.trigger?.movedPermanentId;
  if (movedId === undefined) return false;
  return movedId === source.permanent()?.permanentId;
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-suspend-digimon`,
          description: "[On Play] You may suspend 1 Digimon.",
          optional: true,
          canActivate: (ctx) => suspendableDigimon(ctx).length > 0,
          resolve: suspendOneDigimon,
        }),
      ];
    }

    if (timing === EffectTiming.OnMove) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/when-moving-suspend-digimon`,
          description: "[When Moving] You may suspend 1 Digimon.",
          optional: true,
          when: (ctx) => isSelfMove(ctx, source),
          canActivate: (ctx) => suspendableDigimon(ctx).length > 0,
          resolve: suspendOneDigimon,
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/inherited-battle-won-digivolve`,
          description:
            "[Your Turn] [Once Per Turn] When this Digimon wins a battle, 1 of your " +
            "[Insectoid]/[NSp] Digimon may digivolve into a matching card in hand with the cost reduced by 1.",
          isInherited: true,
          maxPerTurn: 1,
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenBattleWon",
              sourcePermanentId: self.permanentId,
              once: false,
              description: `${cardId}: battle win may digivolve an Insectoid/NSp for 1 less`,
              matches: (subCtx) => {
                if (!subCtx.source.isOwnersTurn() || subCtx.trigger?.subjectPermanentId !== self.permanentId)
                  return false;
                const owner = subCtx.game.player(source.ownerSeat);
                return Array.from(owner.battleArea).some((host) => {
                  if (host.inBreeding || host.topCard === undefined) return false;
                  const base = subCtx.game.definitionOf(host.topCard);
                  if (!isDigimon(base) || !hasInsectoidOrNsp(base)) return false;
                  return owner.hand.some((candidate) => {
                    const evolving = subCtx.game.definitionOf(candidate);
                    return (
                      isDigimon(evolving) &&
                      hasInsectoidOrNsp(evolving) &&
                      canDigivolveOntoWithAlternates(evolving, base)
                    );
                  });
                });
              },
              run: async (subCtx) => {
                const owner = subCtx.game.player(source.ownerSeat);
                const hosts = Array.from(owner.battleArea).filter((host) => {
                  if (host.inBreeding || host.topCard === undefined) return false;
                  const base = subCtx.game.definitionOf(host.topCard);
                  return (
                    isDigimon(base) &&
                    hasInsectoidOrNsp(base) &&
                    owner.hand.some((candidate) => {
                      const evolving = subCtx.game.definitionOf(candidate);
                      return (
                        isDigimon(evolving) &&
                        hasInsectoidOrNsp(evolving) &&
                        canDigivolveOntoWithAlternates(evolving, base)
                      );
                    })
                  );
                });
                if (hosts.length === 0) {
                  subCtx.oncePerTurnActivationDeclined = true;
                  return;
                }
                if (!(await subCtx.ask.optional(subCtx, "Digivolve an [Insectoid] or [NSp] Digimon for 1 less?"))) {
                  subCtx.oncePerTurnActivationDeclined = true;
                  return;
                }
                const hostIds = await subCtx.ask.chooseTargets(subCtx, {
                  candidates: hosts.map((host) => host.permanentId),
                  min: 1,
                  max: 1,
                });
                const host = hostIds[0] === undefined ? undefined : subCtx.game.permanentById(hostIds[0]);
                if (host?.topCard === undefined) {
                  subCtx.oncePerTurnActivationDeclined = true;
                  return;
                }
                const base = subCtx.game.definitionOf(host.topCard);
                const candidates = owner.hand.filter((candidate) => {
                  const evolving = subCtx.game.definitionOf(candidate);
                  return (
                    isDigimon(evolving) && hasInsectoidOrNsp(evolving) && canDigivolveOntoWithAlternates(evolving, base)
                  );
                });
                const chosen = await subCtx.ask.selectCards(subCtx, {
                  candidates: candidates.map((candidate) => candidate.instanceId),
                  min: 1,
                  max: 1,
                });
                if (chosen[0] === undefined) {
                  subCtx.oncePerTurnActivationDeclined = true;
                  return;
                }
                const evolved = await subCtx.fx.digivolveFromInstance(host.permanentId, chosen[0], {
                  payCost: true,
                  costDelta: -1,
                });
                if (evolved === undefined) subCtx.oncePerTurnActivationDeclined = true;
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
