import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, whenDigivolving, turnTiming, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT20-056";

function hasChronicleTraitLv6OrLower(def: CardDefinition): boolean {
  if (!isDigimon(def)) return false;
  if (def.level !== undefined && def.level > 6) return false;
  const types = def.types as string[] | undefined;
  return types?.includes("Chronicle") ?? false;
}

/** Shared resolve body for [On Play] and [When Digivolving]. */
async function recoveryAndBreedingDigivolve(ctx: Parameters<Effect["resolve"]>[0]): Promise<void> {
  const seat = ctx.source.ownerSeat;

  // ＜Recovery +1 (Deck)＞: move the top card of our deck to the top of our security (capped at 5).
  await ctx.fx.recoverToSecurity(seat, 1);

  // The breeding-area digivolution is conditional on an attack; Recovery is not.
  if (ctx.trigger?.attackerPermanentId === undefined) return;

  // Then, if there is a Digimon in our breeding area and a Chronicle Lv.<=6 card in hand/trash,
  // optionally digivolve it.
  const owner = ctx.game.player(seat);
  const breedingPermanent = owner.breeding;
  if (breedingPermanent === undefined) return;
  if (breedingPermanent.topCard === undefined) return;

  const handCandidates = Array.from(owner.hand)
    .filter((c) => hasChronicleTraitLv6OrLower(ctx.game.definitionOf(c)))
    .map((c) => c.instanceId);
  const trashCandidates = Array.from(owner.trash)
    .filter((c) => hasChronicleTraitLv6OrLower(ctx.game.definitionOf(c)))
    .map((c) => c.instanceId);
  const allCandidates = [...handCandidates, ...trashCandidates];

  if (allCandidates.length === 0) return;

  // Optional: ask if player wants to digivolve.
  const willDigivolve = await ctx.ask.optional(
    ctx,
    "Digivolve 1 of your Digimon in the breeding area into a level 6 or lower [Chronicle] Digimon?",
  );
  if (!willDigivolve) return;

  const chosen = await ctx.ask.selectCards(ctx, {
    candidates: allCandidates,
    min: 1,
    max: 1,
  });
  if (chosen.length === 0) return;

  // Digivolve the breeding-area permanent into the chosen card without paying the cost.
  // Q4389: this does NOT fire [When Digivolving] on the breeding-area Digimon.
  await ctx.fx.digivolveFromInstance(breedingPermanent.permanentId, chosen[0]!, {
    payCost: false,
  });
}

export { module };

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Static] ＜Barrier＞ — granted each static pass while on battle area.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/static-barrier`,
          description: "＜Barrier＞",
          resolve: async (ctx) => {
            const perm = ctx.source.permanent();
            if (perm !== undefined) {
              ctx.fx.grantKeyword(perm.permanentId, "Barrier", EffectDuration.UntilEachTurnEnd);
            }
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/inherited-leave-prevention`,
          description: "[All Turns] [Once Per Turn] Alphamon: Ouryuken leave prevention.",
          isInherited: true,
          maxPerTurn: 1,
          when: (ctx) => {
            const host = ctx.source.permanent();
            return host?.topCard !== undefined && ctx.game.definitionOf(host.topCard).nameEn === "Alphamon: Ouryuken";
          },
          resolve: async (ctx) => {
            const host = ctx.source.permanent();
            if (host === undefined) return;
            ctx.fx.subscribeReplacement({
              event: "wouldLeavePlay",
              sourcePermanentId: host.permanentId,
              mode: "prevent",
              causeAllows: (cause, resolvingSeat) => !(cause === "byEffect" && resolvingSeat === source.ownerSeat),
              oncePerTurnKey: `${cardId}/${host.permanentId}/leave-prevention`,
              description: "Prevent Alphamon: Ouryuken from leaving by trashing your top security card.",
              preventCheck: async (subCtx) => {
                const current = subCtx.game.permanentById(host.permanentId);
                if (current === undefined || current.isSuspended) return false;
                const trashed = await subCtx.fx.trashFromSecurity(source.ownerSeat, 1, { fromTop: true });
                return trashed.length > 0;
              },
            });
          },
        }),
      ];
    }

    // [On Play]: ＜Recovery +1 (Deck)＞ + optional breeding-area digivolve into Chronicle Lv.<=6.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-recovery-breed-digivolve`,
          description:
            "[On Play] ＜Recovery +1 (Deck)＞. Then, 1 of your Digimon in the breeding area " +
            "may digivolve into a level 6 or lower [Chronicle] trait Digimon in hand or trash " +
            "without paying the cost.",
          optional: false,
          resolve: recoveryAndBreedingDigivolve,
        }),
      ];
    }

    // [When Digivolving]: same body.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-recovery-breed-digivolve`,
          description:
            "[When Digivolving] ＜Recovery +1 (Deck)＞. Then, 1 of your Digimon in the breeding " +
            "area may digivolve into a level 6 or lower [Chronicle] trait Digimon in hand or trash " +
            "without paying the cost.",
          optional: false,
          resolve: recoveryAndBreedingDigivolve,
        }),
      ];
    }

    // [All Turns] [Once Per Turn] When security stacks are removed from, 1 of your opponent's
    // Digimon gets -8000 DP for the turn.
    // Implemented as OnLoseSecurity timing.
    if (timing === EffectTiming.OnLoseSecurity) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/all-turns-opp-dp-minus-8000`,
          description:
            "[All Turns] [Once Per Turn] When security stacks are removed from, 1 of your " +
            "opponent's Digimon gets -8000 DP for the turn.",
          optional: false,
          maxPerTurn: 1,
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const opponentSeat = ctx.game.opponentOf(ctx.source.ownerSeat);
            return ctx.game.player(opponentSeat).battleArea.some((p) => {
              if (p.topCard === undefined) return false;
              return isDigimon(ctx.game.definitionOf(p.topCard));
            });
          },
          resolve: async (ctx) => {
            const opponentSeat = ctx.game.opponentOf(ctx.source.ownerSeat);
            const candidates = ctx.game
              .player(opponentSeat)
              .battleArea.filter((p) => {
                if (p.topCard === undefined) return false;
                return isDigimon(ctx.game.definitionOf(p.topCard));
              })
              .map((p) => p.permanentId);

            if (candidates.length === 0) return;

            const chosen =
              candidates.length === 1
                ? candidates[0]!
                : (await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 }))[0];

            if (chosen !== undefined) {
              ctx.fx.modifyDP(chosen, -8000, EffectDuration.UntilEachTurnEnd);
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
