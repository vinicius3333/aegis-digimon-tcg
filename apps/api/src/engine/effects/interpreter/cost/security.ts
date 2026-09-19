import type { EffectContext } from "../../EffectContext.js";
import { resolvePermanentTargets, topInstanceIds } from "../targeting/permanents.js";
import type { Cost } from "@aegis/shared";

/**
 * Pay by flipping the top face-up security card face down.
 */
export async function payFlipSecurityCost(ctx: EffectContext): Promise<boolean> {
  // "By flipping your top face-up security card face down" (BT23-043, EX11-031).
  // All-or-nothing: requires a face-up security card to flip.
  return ctx.fx.flipTopSecurity(ctx.source.ownerSeat);
}

/**
 * Pay by trashing the top card of one's own security stack.
 */
export async function payTrashSecurityTopCost(ctx: EffectContext): Promise<boolean> {
  // "By trashing your top security card" (ST23-05). All-or-nothing: requires a
  // security card to trash.
  const seat = ctx.source.ownerSeat;
  if (ctx.game.player(seat).security.length === 0) return false;
  await ctx.fx.trashFromSecurity(seat, 1, { fromTop: true });
  return true;
}

/**
 * Pay by trashing the top security card of BOTH players.
 */
export async function payTrashBothSecurityTopCost(ctx: EffectContext): Promise<boolean> {
  const opponent = ctx.game.opponentOf(ctx.source.ownerSeat);
  if (ctx.game.player(ctx.source.ownerSeat).security.length === 0 || ctx.game.player(opponent).security.length === 0)
    return false;
  await ctx.fx.trashFromSecurity(ctx.source.ownerSeat, 1, { fromTop: true });
  await ctx.fx.trashFromSecurity(opponent, 1, { fromTop: true });
  return true;
}

/**
 * Pay by taking a security card into hand.
 */
export async function paySecurityToHandCost(ctx: EffectContext, cost: Cost): Promise<boolean> {
  // "By adding your top security card to the hand" — all-or-nothing cost.
  const seat = ctx.source.ownerSeat;
  if (ctx.game.player(seat).security.length === 0) return false;
  // "the top OR bottom card" is a CONTROLLER CHOICE (EX6-021/EX6-027, raw "top or bottom"):
  // prompt via the shared binary-choice helper (0 = top, 1 = bottom) instead of silently
  // defaulting to the top end.
  const isChoice = /\btop\s+or\s+bottom\b|\bbottom\s+or\s+top\b/i.test(cost.raw ?? "");
  if (isChoice) {
    const idx = await ctx.ask.chooseOption(ctx, ["top", "bottom"]);
    await ctx.fx.securityToHand(seat, 1, { fromTop: idx === 0 });
    return true;
  }
  await ctx.fx.securityToHand(seat, 1, { fromTop: cost.position !== "bottom" });
  return true;
}

/**
 * Pay by placing a permanent, its top card alone, or its top digivolution card into security.
 */
export async function payPlaceAsSecurityCost(ctx: EffectContext, cost: Cost): Promise<boolean> {
  // "By placing this Digimon as the face-up bottom security card" (BT19-048).
  // Resolves the target (isSelfRef → the source permanent itself), takes its visible top card
  // or, for `fromDigivolutionTop`, the card directly beneath it, then adds that card to the
  // controller's security stack at the encoded position. `"faceUpBottom"` → bottom and face-up.
  // `detachPermanentTop` ("by placing this Digimon's top stacked card as the bottom security
  // card", BT26-033) sheds only the visible top card and promotes the card beneath, so the
  // rest of the stack stays in play.
  const targets = cost.target
    ? await resolvePermanentTargets(ctx, cost.target)
    : (() => {
        const selfPerm = ctx.source.permanent();
        return selfPerm ? [selfPerm.permanentId] : [];
      })();
  const instanceIds =
    cost.fromDigivolutionTop === true
      ? targets.flatMap((permanentId) => {
          const permanent = ctx.game.permanentById(permanentId);
          const topDigivolutionCard = permanent?.stack[permanent.stack.length - 1];
          return topDigivolutionCard === undefined ? [] : [topDigivolutionCard.instanceId];
        })
      : topInstanceIds(ctx, targets);
  if (instanceIds.length === 0) return false;
  const toTop = cost.position !== "bottom" && cost.position !== "faceUpBottom";
  const faceUp = cost.position === "faceUpBottom";
  const detachPermanentTop = cost.detachPermanentTop === true;
  await ctx.fx.addSecurity(ctx.source.ownerSeat, instanceIds, { toTop, faceUp, detachPermanentTop });
  if (!detachPermanentTop) return true;
  const security = ctx.game.player(ctx.source.ownerSeat).security;
  return instanceIds.every((instanceId) => security.some((card) => card.instanceId === instanceId));
}
