import { CardKind, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { GameAccess } from "../../engine/effects/EffectContext.js";
import { onPlay, turnTiming, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT13-094";

function hasBirdTraitDigimon(game: GameAccess, source: CardSource): boolean {
  const owner = game.player(source.ownerSeat);
  return owner.battleArea.some((p) => {
    if (p.inBreeding || p.topCard === undefined) return false;
    const def = game.definitionOf(p.topCard);
    if (!def.kinds.includes(CardKind.Digimon)) return false;
    const types = (def.types ?? []) as string[];
    return types.some((t) => t === "Avian" || t === "Bird");
  });
}

function ownDigimonPermanentIds(game: GameAccess, source: CardSource): string[] {
  const owner = game.player(source.ownerSeat);
  return owner.battleArea
    .filter((p) => !p.inBreeding && p.topCard !== undefined && game.definitionOf(p.topCard).kinds.includes(CardKind.Digimon))
    .map((p) => p.permanentId);
}

function biyomonCandidates(game: GameAccess, ownerSeat: import("@aegis/shared").Seat): string[] {
  const owner = game.player(ownerSeat);
  const fromHand = owner.hand
    .filter((c) => game.definitionOf(c).nameEn.includes("Biyomon"))
    .map((c) => c.instanceId);
  const fromTrash = owner.trash
    .filter((c) => game.definitionOf(c).nameEn.includes("Biyomon"))
    .map((c) => c.instanceId);
  return [...fromHand, ...fromTrash];
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Start of Your Main Phase] if you have a Digimon with [Avian] or [Bird], gain 1 memory
    if (timing === EffectTiming.OnStartMainPhase) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main-phase-memory`,
          description:
            "[Start of Your Main Phase] If you have a Digimon with [Avian] or [Bird] in one " +
            "of its traits, gain 1 memory.",
          optional: false,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          canActivate: (ctx) => hasBirdTraitDigimon(ctx.game, source),
          resolve: async (ctx) => {
            if (hasBirdTraitDigimon(ctx.game, source)) {
              ctx.fx.gainMemory(1);
            }
          },
        }),
      ];
    }

    // [On Play] choose 1 of your Digimon; grant it an [On Deletion] "play 1 [Biyomon]"
    // until end of opponent's turn. Implemented by installing a sub-trigger on the chosen
    // permanent that expires at the end of the opponent's turn.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-grant-on-deletion`,
          description:
            "[On Play] Choose 1 of your Digimon. Until the end of your opponent's turn, it " +
            "gains \"[On Deletion] You may play 1 [Biyomon] from your hand or trash without " +
            "paying the cost.\"",
          optional: false,
          canActivate: (ctx) => ownDigimonPermanentIds(ctx.game, source).length >= 1,
          resolve: async (ctx) => {
            const candidates = ownDigimonPermanentIds(ctx.game, source);
            if (candidates.length === 0) return;

            const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
            if (chosen.length === 0) return;
            const targetPermanentId = chosen[0]!;

            const opponentSeat = ctx.game.opponentOf(source.ownerSeat);

            // Install a deletion watcher on the chosen permanent, expiring at end of opp turn
            ctx.fx.subscribeSubTrigger?.({
              event: "onDeletionOf",
              sourcePermanentId: targetPermanentId,
              once: true,
              expiresOnTurnEndOf: opponentSeat,
              matches: (subCtx) => {
                // Fire only when the target permanent's instance was the one deleted
                const deleted = subCtx.trigger?.deletedInstanceIds ?? [];
                const perm = subCtx.game.permanentById(targetPermanentId);
                if (perm !== undefined) return false; // still alive
                // Check any instance of the target permanent was deleted
                // The permanent is gone; sub fires once per deletion window
                return deleted.length > 0;
              },
              run: async (subCtx) => {
                const candidates2 = biyomonCandidates(subCtx.game, source.ownerSeat);
                if (candidates2.length === 0) return;
                const accept = await subCtx.ask.optional(
                  subCtx,
                  "Play 1 [Biyomon] from your hand or trash without paying the cost?",
                );
                if (!accept) return;
                const picked = await subCtx.ask.selectCards(subCtx, { candidates: candidates2, min: 1, max: 1 });
                if (picked.length > 0) await subCtx.fx.playInstances(picked, { payCost: false });
              },
              description: `${cardId} grant: [On Deletion] play 1 [Biyomon]`,
            });
          },
        }),
      ];
    }

    // [Security] play this Tamer without paying the cost
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "[Security] Play this Tamer without paying the cost.",
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
