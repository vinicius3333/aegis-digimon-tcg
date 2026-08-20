import { CardKind, EffectDuration, EffectTiming } from "@aegis/shared";
import type { CardDefinition, CardInstance, Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, onPlay, staticModifier, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT26-070 — NightChiropmon (BT26, Purple Lv.4 Digimon).
 *
 * Q7092 requires the full 2-card cost; Q7093 prevents combining two copies' cost
 * reductions for one Option use. Each permanent therefore owns an independent OPT.
 *
 * Printed text:
 *   [Digivolve] Lv.3 w/[Glowing Dawn] trait: Cost 2
 *   [On Play] [When Digivolving] ＜Draw 1＞ and trash 1 card in your hand.
 *   [Main] [Once Per Turn] By trashing 2 bottom face-down cards from under any of your
 *     Tamers, you may use 1 Option card with the [Glowing Dawn] trait from your trash
 *     with the cost reduced by 2.
 * Inherited: ＜Retaliation＞
 *
 * Clause mapping:
 *   [Digivolve] header — a digivolution-cost requirement, not an effect clause; already
 *     carried by CardDefinition.evoCosts in cards.json, so it needs no entry here.
 *
 *   EffectTiming.OnPlay / EffectTiming.WhenDigivolving (shared, mandatory) — "＜Draw
 *     1＞ and trash 1 card in your hand." Modeled directly on BT26-067's
 *     `drawAndTrashFromHand` shape (`ctx.fx.draw(seat, 1)` then `ctx.ask.selectCards`
 *     over the hand, `ctx.fx.trash(chosen)`), shared between both timings the same way.
 *     Mandatory (`min: 1`) since the printed text has no "may"; if the hand is
 *     (impossibly) empty after the draw, the loop is a no-op.
 *
 *   EffectTiming.OnDeclaration (`[Main] [Once Per Turn] By trashing 2 bottom face-down
 *     cards from under any of your Tamers, you may use 1 Option card with the [Glowing
 *     Dawn] trait from your trash with the cost reduced by 2.") — the alternate-cost
 *     shape mirrors BT26-006's "any 2 digivolution cards from your [X] Digimon" pool
 *     gather + host grouping (a pool spanning every eligible host is gathered, the
 *     controller picks any 2 from the pool, and the picks are grouped back by host
 *     before each host's `ctx.fx.trashDigivolutionCards` call). Per BT25-035's KB-cited
 *     hand-fix comment (Q6300/Q6301: "all 2 must come from underTamers, may be spread
 *     across multiple Tamers"), the pool here is every face-down card sitting under any
 *     of the controller's Tamers — not restricted to "one per Tamer" — matching that
 *     ruling for the identical "trashing 2 bottom face-down cards from under any of your
 *     Tamers" cost phrase. The "use 1 Option card ... from your trash with the cost
 *     reduced by 2" tail mirrors BT26-012/BT26-026's `useOptionFromHand` + `gainMemory`
 *     shape: `useOptionFromHand`'s own implementation (`primitives.ts`'s `trash()` with
 *     `includeTrash:false`) is a no-op move for an instance already sitting in trash, so
 *     calling it on a trash-resident Option correctly leaves the card in trash while
 *     still firing `whenOptionUsed` — no new "useOptionFromTrash" primitive is needed.
 *     As in BT26-012/026, only the mechanical half of using the Option (pay the reduced
 *     cost, trash it, fire whenOptionUsed) is performed here; re-deriving the
 *     interpreter's own compiled-effect dispatch to run the used Option's printed effect
 *     body from within this card's module would be exactly what card-module contract
 *     forbids.
 *
 *   Inherited ＜Retaliation＞ — explicitly granted from stack position because combat
 *     legality reads the continuous keyword ledger.
 */
const cardId = "BT26-070";
const GLOWING_DAWN_TRAIT = "Glowing Dawn";

function hasGlowingDawnTrait(def: CardDefinition): boolean {
  return (def.types ?? []).includes(GLOWING_DAWN_TRAIT);
}

/** "<Draw 1> and trash 1 card in your hand" — shared by On Play and When Digivolving. */
async function drawAndTrashFromHand(ctx: EffectContext, source: CardSource): Promise<void> {
  await ctx.fx.draw(source.ownerSeat, 1);

  const owner = ctx.game.player(source.ownerSeat);
  if (owner.hand.length === 0) return;

  const chosen = await ctx.ask.selectCards(ctx, {
    candidates: owner.hand.map((c) => c.instanceId),
    min: 1,
    max: 1,
  });
  if (chosen.length > 0) {
    await ctx.fx.trash(chosen, { byEffectSeat: source.ownerSeat });
  }
}

/** The bottom-most face-down card under each of `seat`'s Tamers (may span multiple Tamers). */
function faceDownUnderTamersPool(ctx: EffectContext, seat: Seat): { hostPermanentId: string; card: CardInstance }[] {
  const owner = ctx.game.player(seat);
  const pool: { hostPermanentId: string; card: CardInstance }[] = [];
  for (const p of owner.battleArea) {
    if (p.inBreeding || p.topCard === undefined) continue;
    if (!ctx.game.definitionOf(p.topCard).kinds.includes(CardKind.Tamer)) continue;
    const bottomFaceDown = p.stack.find((card) => !card.faceUp);
    if (bottomFaceDown !== undefined) {
      pool.push({ hostPermanentId: p.permanentId, card: bottomFaceDown });
    }
  }
  return pool;
}

/** `seat`'s trash cards that are Option cards (incl. the Option side of a DUAL card) with [Glowing Dawn]. */
function glowingDawnOptionTrashCards(ctx: EffectContext, seat: Seat): CardInstance[] {
  const owner = ctx.game.player(seat);
  return Array.from(owner.trash).filter((c) => {
    const def = ctx.game.definitionOf(c);
    return def.kinds.includes(CardKind.Option) && hasGlowingDawnTrait(def);
  });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/inherited-retaliation`,
          description: "Inherited: ＜Retaliation＞",
          isInherited: true,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const host = source.permanent();
            if (host !== undefined) ctx.fx.grantKeyword(host.permanentId, "Retaliation", EffectDuration.Permanent);
          },
        }),
      ];
    }

    // [On Play] <Draw 1> and trash 1 card in your hand.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-draw-and-trash`,
          description: "[On Play] <Draw 1> and trash 1 card in your hand.",
          optional: false,
          resolve: async (ctx) => {
            await drawAndTrashFromHand(ctx, source);
          },
        }),
      ];
    }

    // [When Digivolving] Same clause.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-draw-and-trash`,
          description: "[When Digivolving] <Draw 1> and trash 1 card in your hand.",
          optional: false,
          resolve: async (ctx) => {
            await drawAndTrashFromHand(ctx, source);
          },
        }),
      ];
    }

    // [Main] [Once Per Turn] By trashing 2 bottom face-down cards from under any of your
    // Tamers, you may use 1 Option card with the [Glowing Dawn] trait from your trash
    // with the cost reduced by 2.
    if (timing === EffectTiming.OnDeclaration) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-trash-tamers-use-glowing-dawn-trash-option`,
          description:
            "[Main] [Once Per Turn] By trashing 2 bottom face-down cards from under " +
            "any of your Tamers, you may use 1 Option card with the [Glowing Dawn] " +
            "trait from your trash with the cost reduced by 2.",
          optional: true,
          maxPerTurn: 1,
          when: (ctx) => ctx.source.isOnBattleArea(),
          canActivate: (ctx) => {
            const seat = source.ownerSeat;
            const pool = faceDownUnderTamersPool(ctx, seat);
            return (
              pool.length >= 2 &&
              (glowingDawnOptionTrashCards(ctx, seat).length > 0 ||
                pool.some(({ card }) => {
                  const def = ctx.game.definitionOf(card);
                  return def.kinds.includes(CardKind.Option) && hasGlowingDawnTrait(def);
                }))
            );
          },
          resolve: async (ctx) => {
            const seat = source.ownerSeat;

            const pool = faceDownUnderTamersPool(ctx, seat);
            if (pool.length < 2) return;

            const chosenIds = await ctx.ask.selectCards(ctx, {
              candidates: pool.map(({ card }) => card.instanceId),
              min: 2,
              max: 2,
            });
            if (chosenIds.length < 2) return;

            const idsByHost = new Map<string, string[]>();
            for (const id of chosenIds) {
              const entry = pool.find(({ card }) => card.instanceId === id);
              if (entry === undefined) continue;
              const hostIds = idsByHost.get(entry.hostPermanentId) ?? [];
              hostIds.push(id);
              idsByHost.set(entry.hostPermanentId, hostIds);
            }

            let trashedCount = 0;
            for (const [hostId, ids] of idsByHost) {
              const trashed = await ctx.fx.trashDigivolutionCards(hostId, ids, {
                byEffectSeat: seat,
                byEffectCardId: cardId,
              });
              trashedCount += trashed.length;
            }
            if (trashedCount < 2) return;

            const optionCandidates = glowingDawnOptionTrashCards(ctx, seat);
            if (optionCandidates.length === 0) return;

            const chosenOption = await ctx.ask.selectCards(ctx, {
              candidates: optionCandidates.map((c) => c.instanceId),
              min: 0,
              max: 1,
            });
            if (chosenOption.length === 0) return;

            const optionInstance = optionCandidates.find((c) => c.instanceId === chosenOption[0]!);
            if (optionInstance === undefined) return;
            const def = ctx.game.definitionOf(optionInstance);

            const reducedCost = Math.max(0, (def.playCost ?? 0) - 2);
            if (reducedCost > 0) ctx.fx.gainMemory(-reducedCost);
            await ctx.fx.useOptionFromHand(ctx, optionInstance.instanceId, def.playCost);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
