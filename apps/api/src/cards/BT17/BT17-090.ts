import { CardKind, EffectTiming } from "@aegis/shared";
import type { CardDefinition, CardInstance, Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { security, staticModifier, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT17-090 — Tomonori Ryusenji (BT17, Purple Tamer).
 *
 *
 * Effects:
 *   [Your Turn] When an effect places a Tamer card in one of your Digimon's digivolution
 *     cards, by suspending this Tamer, gain 1 memory.
 *   [End of Opponent's Turn][Once Per Turn] If this Tamer is suspended, 1 of your Digimon
 *     with a Tamer card in its digivolution cards may digivolve into a Digimon card with
 *     [Dex] or [DeathX] in its name from your trash without paying the cost.
 *   [Security] Play this card without paying the cost.
 *
 * KB Q2873: the [End of Opponent's Turn] effect does NOT ignore digivolution requirements.
 */

const cardId = "BT17-090";

const isDexOrDeathX = (def: CardDefinition): boolean =>
  (def.kinds as string[]).includes("Digimon") && (def.nameEn.includes("Dex") || def.nameEn.includes("DeathX"));

function hasTamerInDigivolution(perm: Permanent, ctx: EffectContext): boolean {
  return perm.stack.some((c: CardInstance) => {
    const def = ctx.game.definitionOf(c);
    return (def.kinds as string[]).includes("Tamer");
  });
}

function addedCardIsTamer(ctx: EffectContext, hostId: string): boolean {
  const addedIds = ctx.trigger.addedDigivolutionCardInstanceIds ?? [];
  const host = ctx.game.permanentById(hostId);
  if (host === undefined || addedIds.length === 0) return false;
  return addedIds.some((id) => {
    const card = host.stack.find((candidate) => candidate.instanceId === id);
    return card !== undefined && ctx.game.definitionOf(card).kinds.includes(CardKind.Tamer);
  });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/when-tamer-placed-gain-memory`,
          description:
            "[Your Turn] When an effect places a Tamer card in one of your Digimon's digivolution cards, by suspending this Tamer, gain 1 memory.",
          maxPerTurn: 1,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "onAddDigivolutionCards",
              sourcePermanentId: self.permanentId,
              once: false,
              oncePerTurnKey: `${cardId}/when-tamer-placed-gain-memory`,
              matches: (subCtx) =>
                subCtx.trigger.subjectPermanentId === self.permanentId && addedCardIsTamer(subCtx, self.permanentId),
              run: async (subCtx) => {
                const tamer = source.permanent();
                if (tamer === undefined || tamer.isSuspended) return;
                tamer.isSuspended = true;
                subCtx.fx.gainMemory(1);
              },
              description: `${cardId}: suspend this Tamer and gain 1 memory when a Tamer enters a Digimon stack`,
            });
          },
        }),
      ];
    }

    // [End of Opponent's Turn][Once Per Turn] If this Tamer is suspended, 1 of your
    // Digimon with a Tamer card in its digivolution cards may digivolve into a [Dex]/
    // [DeathX] Digimon from your trash without paying cost.
    if (timing === EffectTiming.OnEndTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/eoot-digivolve-dex-deathx`,
          description:
            "[End of Opponent's Turn][Once Per Turn] If this Tamer is suspended, 1 of your " +
            "Digimon with a Tamer card in its digivolution cards may digivolve into a Digimon " +
            "card with [Dex] or [DeathX] in its name from your trash without paying the cost.",
          optional: true,
          maxPerTurn: 1,
          when: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            // Gate: end of OPPONENT's turn only
            if (ctx.source.isOwnersTurn()) return false;
            const self = ctx.source.permanent();
            return self !== undefined && self.isSuspended;
          },
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const self = ctx.source.permanent();
            if (!self?.isSuspended) return false;
            const owner = ctx.game.player(source.ownerSeat);
            const trash = Array.from(owner.trash);
            const hasDexInTrash = trash.some((c) => isDexOrDeathX(ctx.game.definitionOf(c)));
            if (!hasDexInTrash) return false;
            // At least 1 of your Digimon with a Tamer in its digivolution cards.
            return Array.from(owner.battleArea).some(
              (p) =>
                p.topCard !== undefined &&
                (ctx.game.definitionOf(p.topCard).kinds as string[]).includes("Digimon") &&
                hasTamerInDigivolution(p, ctx),
            );
          },
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const self = ctx.source.permanent();
            if (!self?.isSuspended) return;

            // Collect eligible Digimon (own battle area, has Tamer in digivolution cards)
            const eligiblePerms = Array.from(owner.battleArea).filter(
              (p) =>
                p.topCard !== undefined &&
                (ctx.game.definitionOf(p.topCard).kinds as string[]).includes("Digimon") &&
                hasTamerInDigivolution(p, ctx),
            );
            if (eligiblePerms.length === 0) return;

            // Select which Digimon to digivolve
            const targetChosen = await ctx.ask.chooseTargets(ctx, {
              candidates: eligiblePerms.map((p) => p.permanentId),
              min: 0,
              max: 1,
            });
            if (targetChosen.length === 0) return;
            const targetPermId = targetChosen[0]!;
            const targetPerm = ctx.game.permanentById(targetPermId);
            if (!targetPerm) return;

            // Collect [Dex]/[DeathX] Digimon from trash
            const trashCandidates = Array.from(owner.trash)
              .filter((c) => isDexOrDeathX(ctx.game.definitionOf(c)))
              .filter((_c) => {
                // KB Q2873: must satisfy digivolution requirements (no ignore).
                // We check using digivolveFromInstance with payCost:false (checks reqs).
                // checks digivolve requirements but not cost.
                return true; // requirement check happens inside digivolveFromInstance
              })
              .map((c) => c.instanceId);
            if (trashCandidates.length === 0) return;

            const cardChosen = await ctx.ask.selectCards(ctx, {
              candidates: trashCandidates,
              min: 0,
              max: 1,
            });
            if (cardChosen.length === 0) return;

            // Digivolve into the chosen card from trash (free, check requirements).
            await ctx.fx.digivolveFromInstance(targetPermId, cardChosen[0]!, { payCost: false });
          },
        }),
      ];
    }

    // [Security] Play this Tamer without paying the cost.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play-self`,
          description: "[Security] Play this Tamer without paying the cost.",
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
