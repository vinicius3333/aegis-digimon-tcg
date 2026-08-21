import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, security, staticModifier, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * ST24-13 — Marcus Damon & Thomas H. Norstein (ST24, Yellow Tamer).
 *
 *
 * [Rule] This card is also treated as having [Marcus Damon] and [Thomas H. Norstein]
 *   as additional names.
 * [Start of Your Main Phase][On Play] (optional) Place the top card of your deck face
 *   down under this Tamer. Then, if your opponent has a Digimon, gain 1 memory.
 * [Your Turn] When effects trash cards from under this Tamer, by suspending this
 *   Tamer, 1 of your [DATA SQUAD] trait Digimon gains <Jamming> for the turn.
 * [Security] Play this Tamer without paying its memory cost.
 *
 *   EffectTiming.None → rule implementation (name alias) + OnDigivolutionCardDiscarded
 *     SubTrigger (YourTurn/suspend-cost Jamming grant).
 *   the effect factory.ActivateClassesForSharedEffects → OnPlay + StartOfYourMainPhase.
 *   EffectTiming.SecuritySkill → PlaySelfTamerSecurityEffect.
 */

const cardId = "ST24-13";

async function executeSharedMainEffect(ctx: EffectContext, source: CardSource): Promise<void> {
  const owner = ctx.game.player(source.ownerSeat);

  // Optional: place the top card of your deck face down under this Tamer (documented behavior)
  if (owner.deck.length >= 1) {
    const self = ctx.source.permanent();
    if (self !== undefined) {
      const willPlace = await ctx.ask.optional(
        ctx,
        "Place the top card of your deck face down under this Tamer?",
      );
      if (willPlace) {
        const topCardInstance = owner.deck[0];
        if (topCardInstance !== undefined) {
          topCardInstance.faceUp = false;
          await ctx.fx.placeUnder(self.permanentId, [topCardInstance.instanceId], { faceUp: false });
        }
      }
    }
  }

  // Then, if your opponent has a Digimon, gain 1 memory (documented behavior)
  const opponentSeat = ctx.game.opponentOf(source.ownerSeat);
  const opponentDigimon = ctx.game.player(opponentSeat).battleArea.filter(
    (p) => !p.inBreeding,
  );
  if (opponentDigimon.length >= 1) {
    ctx.fx.gainMemory(1);
  }
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const out: Effect[] = [];

    // [Rule] name aliases + [Your Turn] SubTrigger install (documented behavior)
    if (timing === EffectTiming.None) {
      // [Rule] Also treated as [Marcus Damon] and [Thomas H. Norstein] (documented behavior)
      out.push(
        staticModifier({
          source,
          effectKey: `${cardId}/rule-name-aliases`,
          description:
            "[Rule] This card is also treated as [Marcus Damon] and [Thomas H. Norstein].",
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            ctx.fx.grantNameTrait(
              self.permanentId,
              "name",
              ["Marcus Damon", "Thomas H. Norstein"],
              EffectDuration.Permanent,
            );
          },
        }),
      );

      // [Your Turn] onDigivolutionCardDiscarded → optional: suspend + Jamming (documented behavior)
      out.push(
        staticModifier({
          source,
          effectKey: `${cardId}/your-turn-digi-card-trashed-jamming`,
          description:
            "[Your Turn] When effects trash cards from under this Tamer, by suspending this " +
            "Tamer, 1 of your [DATA SQUAD] trait Digimon gains <Jamming> for the turn.",
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;

            ctx.fx.subscribeSubTrigger({
              event: "onDigivolutionCardDiscarded",
              sourcePermanentId: self.permanentId,
              once: false,
              description: `${cardId}: digi-card trashed from THIS Tamer → suspend + Jamming`,
              matches: (subCtx) => {
                // Gate: fires only when the HOST of the trashed digi-card is this Tamer (documented behavior)
                if (subCtx.trigger?.subjectPermanentId !== self.permanentId) return false;
                // Gate: [Your Turn] (documented behavior: IsOwnerTurn)
                if (!subCtx.source.isOwnersTurn()) return false;
                return true;
              },
              run: async (subCtx) => {
                const host = subCtx.source.permanent();
                if (host === undefined) return;
                // Cost: Tamer must be unsuspended (CanActivateSuspendCostEffect, documented behavior)
                if (host.isSuspended) return;

                const willActivate = await subCtx.ask.optional(
                  subCtx,
                  "Suspend this Tamer to give 1 of your [DATA SQUAD] Digimon <Jamming> for the turn?",
                );
                if (!willActivate) return;

                // Pay cost: suspend this Tamer (documented behavior)
                await subCtx.fx.suspend([host.permanentId]);

                // Choose 1 of your [DATA SQUAD] trait Digimon on the battle area (documented behavior)
                const owner = subCtx.game.player(source.ownerSeat);
                const datSquadCandidates = owner.battleArea
                  .filter((p) => {
                    if (p.inBreeding || p.topCard === undefined || !isDigimon(subCtx.game.definitionOf(p.topCard))) return false;
                    const def = subCtx.game.definitionOf(p.topCard);
                    const types = (def.types ?? []) as string[];
                    return types.includes("DATA SQUAD");
                  })
                  .map((p) => p.permanentId);

                if (datSquadCandidates.length === 0) return;

                const picks = await subCtx.ask.chooseTargets(subCtx, {
                  candidates: datSquadCandidates,
                  min: 1,
                  max: 1,
                });
                const selectedId = picks[0] ?? datSquadCandidates[0];
                if (selectedId === undefined) return;

                // Grant <Jamming> for the turn (documented behavior: GainJamming, UntilEachTurnEnd)
                const targetPerm = owner.battleArea.find(
                  (p) => p.permanentId === selectedId || p.topCard?.instanceId === selectedId,
                );
                if (targetPerm !== undefined) {
                  subCtx.fx.grantKeyword(
                    targetPerm.permanentId,
                    "Jamming",
                    EffectDuration.UntilEachTurnEnd,
                  );
                  await subCtx.fx.recomputeContinuousEffects?.();
                }
              },
            });
          },
        }),
      );
    }

    // [Start of Your Main Phase] shared body (documented behavior; startOfYourMainPhase flag)
    if (timing === EffectTiming.OnStartMainPhase) {
      out.push(
        turnTiming({
          source,
          effectKey: `${cardId}/start-main-phase-shared`,
          description:
            "[Start of Your Main Phase] You may place the top card of your deck face down under " +
            "this Tamer. Then, if your opponent has a Digimon, gain 1 memory.",
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          resolve: async (ctx) => {
            await executeSharedMainEffect(ctx, source);
          },
        }),
      );
    }

    // [On Play] shared body (documented behavior; onPlay flag)
    if (timing === EffectTiming.OnPlay) {
      out.push(
        onPlay({
          source,
          effectKey: `${cardId}/on-play-shared`,
          description:
            "[On Play] You may place the top card of your deck face down under this Tamer. " +
            "Then, if your opponent has a Digimon, gain 1 memory.",
          resolve: async (ctx) => {
            await executeSharedMainEffect(ctx, source);
          },
        }),
      );
    }

    // [Security] Play this Tamer without paying its memory cost (documented behavior)
    if (timing === EffectTiming.SecuritySkill) {
      out.push(
        security({
          source,
          effectKey: `${cardId}/security-play-self`,
          description: "[Security] Play this Tamer without paying its memory cost.",
          resolve: async (ctx) => {
            await ctx.fx.playInstances([source.instanceId], { payCost: false });
          },
        }),
      );
    }

    return out;
  },
};

registerCard(module);
export default module;
