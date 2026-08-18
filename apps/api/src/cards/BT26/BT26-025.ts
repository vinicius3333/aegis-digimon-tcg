import { CardKind, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, turnTiming, whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-025 — Liollmon (BT26, Yellow Lv.3 Digimon).
//
// Provisional port: no KB entry (errata/Q&A) exists yet for BT26-025 as of this port
// (`node tools/kb/query.mjs card BT26-025` returned no knowledge-base entries). implemented
// from the printed card text only.
//
// [Digivolve] Lv.2 w/[Glowing Dawn] trait: Cost 0 — a digivolution-cost requirement,
//   not an effect clause; already carried by CardDefinition.evoCosts in cards.json and
//   read directly by the engine's digivolution logic, so it needs no entry here.
// [When Moving] [On Play] By placing your top security card face down under any of
//   your [Glowing Dawn] trait Tamers, ＜Recovery +1＞
// Inherited: [When Attacking] [Once Per Turn] You may add your top security card to
//   the hand. Then, if you have 0 security cards, ＜Recovery +1＞
//
// Modeled on BT26-004's identically shaped "[Glowing Dawn] trait Tamers" targeting
// helper (hasGlowingDawnTrait / glowingDawnTamerTargets, copied here per card-file
// self-containment) and on BT26-008's shared OnPlay/OnMove clause shape (one resolve
// function, `when: isSelfMove` gating the OnMove entry — §15-16-16-1, the engine's
// OnMove window). "By placing ... <Recovery +1>" is a cost-gated effect (optional:
// true, same convention as BT26-089/BT26-004's uncosted "By ..." clauses — the player
// always may decline to pay a stated cost). Placement uses ctx.fx.placeUnder (the
// existing "face down under a permanent" primitive) and ＜Recovery +1＞ uses
// ctx.fx.recoverToSecurity (the primitive backing the printed keyword, per
// interpreter.ts's own keyword dispatch).
//
// The inherited [When Attacking] clause is modeled on BT26-022's "add your top
// security card to the hand" (ctx.fx.securityToHand) combined with a post-check on the
// resulting security count before granting ＜Recovery +1＞, and on BT26-004's inherited
// [When Attacking] shape (EffectTiming.OnAllyAttack + whenAttacking + isInherited: true
// + maxPerTurn: 1).

const cardId = "BT26-025";

function hasGlowingDawnTrait(ctx: EffectContext, permanentId: string): boolean {
  const perm = ctx.game.permanentById(permanentId);
  if (perm === undefined || perm.topCard === undefined) return false;
  const def = ctx.game.definitionOf(perm.topCard);
  if (!def.kinds?.includes(CardKind.Tamer)) return false;
  return (def.types ?? []).includes("Glowing Dawn");
}

function glowingDawnTamerTargets(ctx: EffectContext, source: CardSource): string[] {
  const owner = ctx.game.player(source.ownerSeat);
  return Array.from(owner.battleArea)
    .filter((p) => !p.inBreeding && hasGlowingDawnTrait(ctx, p.permanentId))
    .map((p) => p.permanentId);
}

/** Whether this permanent has a top security card and an eligible Tamer to pay the cost to. */
function canPlaceSecurityUnderGlowingDawnTamer(ctx: EffectContext, source: CardSource): boolean {
  return ctx.game.player(source.ownerSeat).security.length > 0 && glowingDawnTamerTargets(ctx, source).length > 0;
}

/**
 * "By placing your top security card face down under any of your [Glowing Dawn]
 * trait Tamers, ＜Recovery +1＞" — shared by the [On Play] and [When Moving] windows.
 */
async function placeSecurityUnderGlowingDawnTamerAndRecover(ctx: EffectContext, source: CardSource): Promise<void> {
  const owner = ctx.game.player(source.ownerSeat);
  const tamerTargets = glowingDawnTamerTargets(ctx, source);
  const topSecurity = owner.security[0];
  if (topSecurity === undefined || tamerTargets.length === 0) return;

  let targetPermanentId: string;
  if (tamerTargets.length === 1) {
    targetPermanentId = tamerTargets[0]!;
  } else {
    const chosen = await ctx.ask.chooseTargets(ctx, { candidates: tamerTargets, min: 1, max: 1 });
    if (chosen.length === 0) return;
    targetPermanentId = chosen[0]!;
  }

  await ctx.fx.placeUnder(targetPermanentId, [topSecurity.instanceId]);
  await ctx.fx.recoverToSecurity(source.ownerSeat, 1);
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
    // [On Play] By placing your top security card face down under any of your
    // [Glowing Dawn] trait Tamers, ＜Recovery +1＞
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-place-security-recover`,
          description:
            "[On Play] By placing your top security card face down under any of your " +
            "[Glowing Dawn] trait Tamers, ＜Recovery +1＞",
          optional: true,
          canActivate: (ctx) => canPlaceSecurityUnderGlowingDawnTamer(ctx, source),
          resolve: async (ctx) => {
            await placeSecurityUnderGlowingDawnTamerAndRecover(ctx, source);
          },
        }),
      ];
    }

    // [When Moving] Same clause, fired when this Digimon itself moves from the
    // breeding area to the battle area (§15-16-16-1; engine's OnMove window).
    if (timing === EffectTiming.OnMove) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/when-moving-place-security-recover`,
          description:
            "[When Moving] By placing your top security card face down under any of your " +
            "[Glowing Dawn] trait Tamers, ＜Recovery +1＞",
          optional: true,
          when: (ctx) => isSelfMove(ctx, source),
          canActivate: (ctx) => canPlaceSecurityUnderGlowingDawnTamer(ctx, source),
          resolve: async (ctx) => {
            await placeSecurityUnderGlowingDawnTamerAndRecover(ctx, source);
          },
        }),
      ];
    }

    // Inherited: [When Attacking] [Once Per Turn] You may add your top security card
    // to the hand. Then, if you have 0 security cards, ＜Recovery +1＞
    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/when-attacking-security-to-hand-recover`,
          description:
            "[When Attacking] [Once Per Turn] You may add your top security card to the " +
            "hand. Then, if you have 0 security cards, ＜Recovery +1＞",
          optional: true,
          isInherited: true,
          maxPerTurn: 1,
          canActivate: (ctx) => ctx.game.player(source.ownerSeat).security.length > 0,
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            if (owner.security.length === 0) return;

            await ctx.fx.securityToHand(source.ownerSeat, 1, { fromTop: true });

            if (ctx.game.player(source.ownerSeat).security.length === 0) {
              await ctx.fx.recoverToSecurity(source.ownerSeat, 1);
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
