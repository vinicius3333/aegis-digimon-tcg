import { EffectTiming, canAssignDistinctColors } from "@aegis/shared";
import type { CardDefinition, CardInstance } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { security, onPlay, turnTiming, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// J.P., Koji, & Koichi — AD1-023 (Black/Yellow/Purple Tamer).
//
// Printed text (cards.json AD1-023):
//   [Security] Play this card without paying the cost.
//   [Start of Your Main Phase] [On Play] You may place up to 2 [Hybrid] trait cards
//     with different colors from your hand or trash under this Tamer. If this effect
//     placed, <Draw 1>. Then, if there are 4 or more [Hybrid] trait cards under this
//     Tamer, gain 2 memory.
//   Inherited: [All Turns] [Once Per Turn] When this Digimon with the [Hybrid] or
//     [Ten Warriors] trait would leave the battle area, by adding your top security
//     card to the hand, it doesn't leave.
//
// KB (node tools/kb/query.mjs card AD1-023):
//   Q6113 (with CR 4-24-2): each chosen card only has to contribute ONE color no other
//     chosen card is using — a multicolor card does not occupy all of its colors. So two
//     copies of the same red/blue card DO qualify (one read as red, the other as blue).
//     Legality is therefore a distinct-color assignment, not a color-set comparison.
//   Q6114: the "then, if 4+ [Hybrid] cards under this card, gain 2 memory" clause can
//     be processed WITHOUT placing any card this activation (it is not gated on
//     "if this effect placed" — only the <Draw 1> is).
//
// [Hybrid]/[Ten Warriors] trait data is now populated in cards.json (forms/
// attributes/types), so the shared placement clause and the inherited leave-
// prevention's trait gate are both implementable.
const cardId = "AD1-023";

function hasTrait(def: CardDefinition, trait: string): boolean {
  return (
    (def.forms ?? []).includes(trait) ||
    (def.attributes ?? []).includes(trait) ||
    (def.types ?? []).includes(trait)
  );
}

function isHybrid(def: CardDefinition): boolean {
  return hasTrait(def, "Hybrid");
}

function isHybridOrTenWarriors(def: CardDefinition): boolean {
  return hasTrait(def, "Hybrid") || hasTrait(def, "Ten Warriors");
}

function colorsDiffer(a: CardDefinition, b: CardDefinition): boolean {
  return canAssignDistinctColors([a.colors ?? [], b.colors ?? []]);
}

/**
 * Shared [On Play] / [Start of Your Main Phase] body: place up to 2 differently
 * colored [Hybrid] trait cards from hand/trash under this Tamer, draw 1 if any were
 * placed, then (unconditionally — Q6114) gain 2 memory if 4+ [Hybrid] cards now sit
 * under this Tamer.
 */
async function resolvePlaceHybridCards(ctx: EffectContext, source: CardSource): Promise<void> {
  const self = ctx.source.permanent();
  if (self === undefined) return;
  const selfPermanentId = self.permanentId;
  const owner = ctx.game.player(source.ownerSeat);

  const candidates: CardInstance[] = [
    ...Array.from(owner.hand).filter((c) => isHybrid(ctx.game.definitionOf(c))),
    ...Array.from(owner.trash).filter((c) => isHybrid(ctx.game.definitionOf(c))),
  ];

  const placed: string[] = [];
  if (candidates.length > 0) {
    const first = await ctx.ask.selectCards(ctx, {
      candidates: candidates.map((c) => c.instanceId),
      min: 0,
      max: 1,
    });
    if (first.length > 0) {
      placed.push(first[0]!);
      const firstDef = ctx.game.definitionOf(
        candidates.find((c) => c.instanceId === first[0])!,
      );
      const secondCandidates = candidates.filter(
        (c) => c.instanceId !== first[0] && colorsDiffer(ctx.game.definitionOf(c), firstDef),
      );
      if (secondCandidates.length > 0) {
        const second = await ctx.ask.selectCards(ctx, {
          candidates: secondCandidates.map((c) => c.instanceId),
          min: 0,
          max: 1,
        });
        if (second.length > 0) placed.push(second[0]!);
      }
    }
  }

  if (placed.length > 0) {
    await ctx.fx.placeUnder(selfPermanentId, placed);
    await ctx.fx.draw(source.ownerSeat, 1);
  }

  // Q6114: evaluated regardless of whether this activation placed anything.
  const updated = ctx.game.permanentById(selfPermanentId);
  const hybridUnderCount =
    updated?.stack.filter((c) => isHybrid(ctx.game.definitionOf(c))).length ?? 0;
  if (hybridUnderCount >= 4) {
    ctx.fx.gainMemoryForSeat(source.ownerSeat, 2);
  }
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Security] Play this card without paying the cost.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/play-from-security`,
          description: "[Security] Play this card without paying the cost.",
          optional: false,
          resolve: async (ctx) => {
            await ctx.fx.playFromSecurity(source.instanceId, { payCost: false });
          },
        }),
      ];
    }

    // [On Play] (shared body — see resolvePlaceHybridCards).
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/place-hybrid-cards`,
          description:
            "[On Play] You may place up to 2 [Hybrid] trait cards with different colors " +
            "from your hand or trash under this Tamer. If this effect placed, <Draw 1>. " +
            "Then, if there are 4 or more [Hybrid] trait cards under this Tamer, gain 2 memory.",
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => resolvePlaceHybridCards(ctx, source),
        }),
      ];
    }

    // [Start of Your Main Phase] (shared body — see resolvePlaceHybridCards).
    if (timing === EffectTiming.OnStartMainPhase) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/place-hybrid-cards`,
          description:
            "[Start of Your Main Phase] You may place up to 2 [Hybrid] trait cards with " +
            "different colors from your hand or trash under this Tamer. If this effect " +
            "placed, <Draw 1>. Then, if there are 4 or more [Hybrid] trait cards under " +
            "this Tamer, gain 2 memory.",
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          resolve: async (ctx) => resolvePlaceHybridCards(ctx, source),
        }),
      ];
    }

    // Inherited [All Turns] [Once Per Turn]: when the Digimon hosting this card (as a
    // digivolution card) with the [Hybrid] or [Ten Warriors] trait would leave the
    // battle area, by adding your top security card to hand, it doesn't leave.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/inherited-prevent-leave`,
          description:
            "[All Turns] [Once Per Turn] When this Digimon with the [Hybrid] or [Ten " +
            "Warriors] trait would leave the battle area, by adding your top security " +
            "card to the hand, it doesn't leave.",
          isInherited: true,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const host = ctx.source.permanent();
            if (host === undefined) return;
            const hostId = host.permanentId;

            ctx.fx.subscribeReplacement({
              event: "wouldLeavePlay",
              sourcePermanentId: hostId,
              mode: "prevent",
              oncePerTurnKey: `${cardId}/inherited-prevent-leave`,
              description:
                "[All Turns] [Once Per Turn] By adding your top security card to hand, " +
                "this [Hybrid]/[Ten Warriors] Digimon doesn't leave the battle area.",
              protects: (subCtx, leavingId) => {
                if (leavingId !== hostId) return false;
                const leaving = subCtx.game.permanentById(leavingId);
                if (leaving === undefined || leaving.topCard === undefined) return false;
                return isHybridOrTenWarriors(subCtx.game.definitionOf(leaving.topCard));
              },
              preventCheck: async (subCtx) => {
                const owner = subCtx.game.player(source.ownerSeat);
                if (owner.security.length === 0) return false;

                const wantToPay = await subCtx.ask.optional(
                  subCtx,
                  "Add your top security card to hand to keep this Digimon from leaving the battle area?",
                );
                if (!wantToPay) return false;

                await subCtx.fx.securityToHand(source.ownerSeat, 1, { fromTop: true });
                return true;
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
