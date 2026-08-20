import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition, Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { canDigivolveOntoWithAlternates, cardHasTrait } from "../../engine/cards/cardData.js";
import { onPlay, staticModifier, whenDigivolving, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-038 — Kuwagamon (BT26, Green Lv.4 Digimon).
//
// KB Q7018-Q7023 confirm either player's Digimon may be suspended, battle wins include
// security battles, deletion-prevention does not suppress a win, and the relevant battle
// timing/order boundaries.
//
// [Digivolve] Lv.3 w/[TS] trait: Cost 2 — a digivolution-cost requirement, not an effect
//   clause; already carried by CardDefinition.evoCosts in cards.json, so it needs no
//   entry here.
// [When Moving] [On Play] [When Digivolving] You may suspend 1 Digimon. Then, 1 of your
//   Digimon with the [Insectoid] or [Titan] trait gets +3000 DP until your opponent's
//   turn ends.
// Inherited: [Your Turn] [Once Per Turn] When this Digimon wins a battle, 1 of your
//   [Insectoid] or [Titan] trait Digimon may digivolve into an [Insectoid] or [Titan]
//   trait Digimon card in the hand with the cost reduced by 1.
//   The engine fires `whenBattleWon` from combat resolution, so this inherited clause is
//   implemented below as a live watcher.

const cardId = "BT26-038";

function hasInsectoidOrTitan(def: CardDefinition): boolean {
  return cardHasTrait(def, "Insectoid") || cardHasTrait(def, "Titan");
}

function insectoidOrTitanTargets(ctx: EffectContext, source: CardSource): Permanent[] {
  const owner = ctx.game.player(source.ownerSeat);
  return Array.from(owner.battleArea).filter(
    (p) =>
      !p.inBreeding &&
      p.topCard !== undefined &&
      isDigimon(ctx.game.definitionOf(p.topCard)) &&
      hasInsectoidOrTitan(ctx.game.definitionOf(p.topCard)),
  );
}

function allDigimonInPlay(ctx: EffectContext): Permanent[] {
  const targets: Permanent[] = [];
  for (const seat of [0, 1] as const) {
    targets.push(
      ...Array.from(ctx.game.player(seat).battleArea).filter(
        (p) => !p.inBreeding && p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)),
      ),
    );
  }
  return targets;
}

/** "You may suspend 1 Digimon. Then, 1 of your [Insectoid]/[Titan] Digimon gets +3000 DP." */
async function suspendThenBuffInsectoidOrTitan(ctx: EffectContext, source: CardSource): Promise<void> {
  const suspendCandidates = allDigimonInPlay(ctx);
  if (suspendCandidates.length > 0) {
    const chosenToSuspend = await ctx.ask.chooseTargets(ctx, {
      candidates: suspendCandidates.map((p) => p.permanentId),
      min: 0,
      max: 1,
    });
    if (chosenToSuspend.length > 0) {
      await ctx.fx.suspend(chosenToSuspend);
    }
  }

  const buffTargets = insectoidOrTitanTargets(ctx, source);
  if (buffTargets.length === 0) return;

  let chosenId: string;
  if (buffTargets.length === 1) {
    chosenId = buffTargets[0]!.permanentId;
  } else {
    const chosen = await ctx.ask.chooseTargets(ctx, {
      candidates: buffTargets.map((p) => p.permanentId),
      min: 1,
      max: 1,
    });
    if (chosen.length === 0) return;
    chosenId = chosen[0]!;
  }

  ctx.fx.modifyDP(chosenId, 3000, EffectDuration.UntilOpponentTurnEnd);
}

/** Whether this card is the permanent that just moved from breeding to battle. */
function isSelfMove(ctx: EffectContext, source: CardSource): boolean {
  const movedId = ctx.trigger?.movedPermanentId;
  if (movedId === undefined) return false;
  return movedId === source.permanent()?.permanentId;
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [On Play] You may suspend 1 Digimon. Then, 1 of your [Insectoid] or [Titan] trait
    // Digimon gets +3000 DP until your opponent's turn ends.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-suspend-and-buff`,
          description:
            "[On Play] You may suspend 1 Digimon. Then, 1 of your [Insectoid] or [Titan] " +
            "trait Digimon gets +3000 DP until your opponent's turn ends.",
          optional: false,
          resolve: async (ctx) => {
            await suspendThenBuffInsectoidOrTitan(ctx, source);
          },
        }),
      ];
    }

    // [When Digivolving] Same clause.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-suspend-and-buff`,
          description:
            "[When Digivolving] You may suspend 1 Digimon. Then, 1 of your [Insectoid] or " +
            "[Titan] trait Digimon gets +3000 DP until your opponent's turn ends.",
          optional: false,
          resolve: async (ctx) => {
            await suspendThenBuffInsectoidOrTitan(ctx, source);
          },
        }),
      ];
    }

    // [When Moving] Same clause, fired when this Digimon itself moves from the
    // breeding area to the battle area (engine's OnMove window).
    if (timing === EffectTiming.OnMove) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/when-moving-suspend-and-buff`,
          description:
            "[When Moving] You may suspend 1 Digimon. Then, 1 of your [Insectoid] or " +
            "[Titan] trait Digimon gets +3000 DP until your opponent's turn ends.",
          optional: false,
          when: (ctx) => isSelfMove(ctx, source),
          resolve: async (ctx) => {
            await suspendThenBuffInsectoidOrTitan(ctx, source);
          },
        }),
      ];
    }

    // [Your Turn][Once Per Turn] inherited: when this Digimon wins a battle, one of your
    // Insectoid/Titan Digimon may digivolve into a matching card from hand for 1 less.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/inherited-battle-won-digivolve`,
          description:
            "[Your Turn][Once Per Turn] When this Digimon wins a battle, one of your " +
            "[Insectoid]/[Titan] Digimon may digivolve into a matching card from your hand " +
            "with the digivolution cost reduced by 1.",
          isInherited: true,
          maxPerTurn: 1,
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenBattleWon",
              sourcePermanentId: self.permanentId,
              once: false,
              description: `${cardId}: when this Digimon wins a battle, may digivolve a trait Digimon from hand`,
              matches: (subCtx) => {
                if (!subCtx.source.isOwnersTurn() || subCtx.trigger?.subjectPermanentId !== self.permanentId) {
                  return false;
                }
                const owner = subCtx.game.player(source.ownerSeat);
                return Array.from(owner.battleArea).some((host) => {
                  if (host.inBreeding || host.topCard === undefined) return false;
                  const base = subCtx.game.definitionOf(host.topCard);
                  if (!isDigimon(base) || !hasInsectoidOrTitan(base)) return false;
                  return owner.hand.some((candidate) => {
                    const evolving = subCtx.game.definitionOf(candidate);
                    return (
                      isDigimon(evolving) &&
                      hasInsectoidOrTitan(evolving) &&
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
                    hasInsectoidOrTitan(base) &&
                    owner.hand.some((candidate) => {
                      const evolving = subCtx.game.definitionOf(candidate);
                      return (
                        isDigimon(evolving) &&
                        hasInsectoidOrTitan(evolving) &&
                        canDigivolveOntoWithAlternates(evolving, base)
                      );
                    })
                  );
                });
                if (hosts.length === 0) {
                  subCtx.oncePerTurnActivationDeclined = true;
                  return;
                }
                const activate = await subCtx.ask.optional(
                  subCtx,
                  "Digivolve 1 of your [Insectoid] or [Titan] Digimon with the cost reduced by 1?",
                );
                if (!activate) {
                  subCtx.oncePerTurnActivationDeclined = true;
                  return;
                }
                const hostIds = await subCtx.ask.chooseTargets(subCtx, {
                  candidates: hosts.map((p) => p.permanentId),
                  min: 1,
                  max: 1,
                });
                if (hostIds.length === 0) {
                  subCtx.oncePerTurnActivationDeclined = true;
                  return;
                }
                const host = subCtx.game.permanentById(hostIds[0]!);
                if (host?.topCard === undefined) {
                  subCtx.oncePerTurnActivationDeclined = true;
                  return;
                }
                const base = subCtx.game.definitionOf(host.topCard);
                const handCandidates = owner.hand.filter((candidate) => {
                  const evolving = subCtx.game.definitionOf(candidate);
                  return (
                    isDigimon(evolving) &&
                    hasInsectoidOrTitan(evolving) &&
                    canDigivolveOntoWithAlternates(evolving, base)
                  );
                });
                const chosen = await subCtx.ask.selectCards(subCtx, {
                  candidates: handCandidates.map((card) => card.instanceId),
                  min: 1,
                  max: 1,
                });
                if (chosen.length === 0) {
                  subCtx.oncePerTurnActivationDeclined = true;
                  return;
                }
                const evolved = await subCtx.fx.digivolveFromInstance(hostIds[0]!, chosen[0]!, {
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
