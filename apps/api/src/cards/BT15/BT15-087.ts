import { CardKind, EffectDuration, EffectTiming } from "@aegis/shared";
import type { CardInstance, Permanent, Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { security, turnTiming, activated, staticModifier } from "../../engine/effects/builders.js";
import { cardHasTrait } from "../../engine/cards/cardData.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT15-087 — Shuu Yulin (BT15, Red/Blue Tamer).
 *
 *
 *   PlaySelfTamerSecurityEffect → EffectTiming.SecuritySkill: play self without cost.
 *   SetMemoryTo3TamerEffect → EffectTiming.OnStartTurn: if memory ≤ 2, set to 3.
 *   MindLinkTamerEffect → EffectTiming.OnDeclaration ([Main]): place this Tamer under
 *     a chosen own Digimon with [X Antibody]/[DigiPolice] trait and no Tamer in stack.
 *   [All Turns] inherited continuous → EffectTiming.None (isInherited: true): while
 *     host has [X Antibody]/[DigiPolice] trait, grant ＜TeamWork＞ and ＜Reboot＞.
 *   [End of All Turns] inherited → EffectTiming.OnEndTurn (isInherited: true): may play
 *     1 [Shuu Yulin] from host's digivolution cards without paying cost (KB Q2585:
 *     can play itself).
 *
 * KB rulings (binding):
 *   Q2585: the [End of All Turns] inherited effect can play Shuu Yulin itself.
 *
 * Residuals:
 *   ＜TeamWork＞ keyword requires combat-phase wiring (suspend side Digimon, add its DP)
 *   beyond what grantKeyword alone provides — the keyword grant is correct but the
 *   TeamWork combat resolution is not fully wired in the engine. The ＜Reboot＞ grant
 *   and the keyword themselves are fully implemented here.
 */
const cardId = "BT15-087";

function hasXAntibodyOrDigiPolice(perm: Permanent, ctx: EffectContext): boolean {
  if (perm.topCard === undefined) return false;
  const def = ctx.game.definitionOf(perm.topCard);
  return cardHasTrait(def, "X Antibody") || cardHasTrait(def, "DigiPolice");
}

function hasTamerInStack(perm: Permanent, ctx: EffectContext): boolean {
  return perm.stack.some((c) => {
    if (!c.faceUp) return false;
    const def = ctx.game.definitionOf(c);
    return (def.kinds as string[]).includes(CardKind.Tamer as string);
  });
}

function mindLinkTargets(ctx: EffectContext, ownerSeat: Seat): string[] {
  return ctx.game.player(ownerSeat).battleArea
    .filter((p) => {
      if (p.topCard === undefined || p.inBreeding) return false;
      return hasXAntibodyOrDigiPolice(p, ctx) && !hasTamerInStack(p, ctx);
    })
    .map((p) => p.permanentId);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Security] Play this card without paying the cost.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play-self`,
          description: "[Security] Play this card without paying the cost.",
          resolve: async (ctx) => {
            await ctx.fx.playInstances([source.instanceId], { payCost: false });
          },
        }),
      ];
    }

    // [Start of Your Turn] If you have 2 memory or less, set your memory to 3.
    if (timing === EffectTiming.OnStartTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-of-your-turn-set-memory-3`,
          description: "[Start of Your Turn] If you have 2 memory or less, set your memory to 3.",
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          resolve: async (ctx) => {
            if (!ctx.source.isOnBattleArea()) return;
            const state = ctx.game.state;
            if (state.memory <= 2) {
              ctx.fx.setMemory(3);
            }
          },
        }),
      ];
    }

    // [Main] <Mind Link>: place this Tamer under a chosen own Digimon with
    // [X Antibody]/[DigiPolice] trait, if there are no Tamer cards in its stack.
    if (timing === EffectTiming.OnDeclaration) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-mind-link`,
          description:
            "[Main] <Mind Link> with 1 of your Digimon with the [X Antibody]/[DigiPolice] trait " +
            "(no Tamer cards in its digivolution cards).",
          optional: false,
          canActivate: (ctx) => mindLinkTargets(ctx, source.ownerSeat).length > 0,
          resolve: async (ctx) => {
            const candidates = mindLinkTargets(ctx, source.ownerSeat);
            if (candidates.length === 0) return;

            const chosen = await ctx.ask.chooseTargets(ctx, {
              candidates,
              min: 1,
              max: 1,
            });
            if (chosen.length === 0) return;

            const tamerPerm = ctx.source.permanent();
            if (tamerPerm === undefined) return;

            ctx.fx.relocatePermanent(chosen[0]!, tamerPerm.permanentId);
          },
        }),
      ];
    }

    // [All Turns] inherited: while host has [X Antibody]/[DigiPolice] trait, grant
    // <TeamWork> and <Reboot> to the host Digimon.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/inherited-all-turns-teamwork-reboot`,
          description:
            "[All Turns][Inherited] While this Digimon has the [X Antibody]/[DigiPolice] trait, " +
            "it gains ＜TeamWork＞ and ＜Reboot＞.",
          isInherited: true,
          resolve: async (ctx) => {
            // source.permanent() returns the HOST Digimon when this card is in its stack.
            const host = ctx.source.permanent();
            if (host === undefined) return;
            if (!hasXAntibodyOrDigiPolice(host, ctx)) return;

            ctx.fx.grantKeyword(host.permanentId, "TeamWork", EffectDuration.UntilEachTurnEnd);
            ctx.fx.grantKeyword(host.permanentId, "Reboot", EffectDuration.UntilEachTurnEnd);
          },
        }),
      ];
    }

    // [End of All Turns] inherited: may play 1 [Shuu Yulin] from this Digimon's
    // digivolution cards without paying the cost.
    if (timing === EffectTiming.OnEndTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/inherited-end-of-all-turns-play-shuu-yulin`,
          description:
            "[End of All Turns][Inherited] You may play 1 [Shuu Yulin] from this Digimon's " +
            "digivolution cards without paying the cost.",
          isInherited: true,
          optional: true,
          resolve: async (ctx) => {
            const host = ctx.source.permanent();
            if (host === undefined) return;

            const candidates: CardInstance[] = host.stack.filter((c) => {
              const def = ctx.game.definitionOf(c);
              return (
                def.nameEn === "Shuu Yulin" &&
                (def.kinds as string[]).includes(CardKind.Tamer as string)
              );
            });
            if (candidates.length === 0) return;

            const willPlay = await ctx.ask.optional(
              ctx,
              "Play 1 [Shuu Yulin] from this Digimon's digivolution cards without paying the cost?",
            );
            if (!willPlay) return;

            const picks = await ctx.ask.selectCards(ctx, {
              candidates: candidates.map((c) => c.instanceId),
              min: 1,
              max: 1,
            });
            if (picks.length === 0) return;

            await ctx.fx.playInstances(picks, { payCost: false });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
