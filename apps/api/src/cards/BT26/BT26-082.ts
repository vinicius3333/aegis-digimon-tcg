import { CardKind, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardInstance, Permanent, Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenDigivolving, turnTiming, security, onDeletion } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { requireOpponentAsk } from "../../engine/decisions/decisionApi.js";

/**
 * BT26-082 — Ravemon (BT26, Purple Lv.6 Digimon, Cyborg/DATA SQUAD).
 *
 * BT26 is a new set with no source documented behavior reference. `node tools/kb/query.mjs card
 * BT26-082` returns no knowledge-base entries (no errata/Q&A/rules hits) — this port
 * is provisional, following the printed text directly and mirroring the closest
 * existing hand-written cards for each clause shape (convention per
 * apps/api/src/cards/BT26/BT26-098.ts). Re-check against the KB once BT26 rulings land.
 *
 * Printed text:
 *   [Digivolve] [Crowmon]/Lv.5 w/[DATA SQUAD] trait: Cost 3 — a digivolution-cost
 *     requirement, not an effect clause; already carried by CardDefinition.evoCosts in
 *     cards.json and read directly by the engine's digivolution logic, so it needs no
 *     entry here (both the named-card and generic-DATA-SQUAD digivolution paths are
 *     handled centrally, per the card implementation notes).
 *
 *   [Security] [End of Opponent's Turn] Play this card without paying the cost.
 *   [When Digivolving] [End of Attack] By deleting this Digimon or trashing 2 bottom
 *     face-down cards from under any of your Tamers, delete 1 of your opponent's
 *     highest DP Digimon.
 *   [On Deletion] Your opponent trashes 1 card in their hand. Then, if their hand has 7
 *     or fewer cards, you may place this card face up as the bottom security card.
 *
 * KNOWN ENGINE DIVERGENCE #1 — the [Security][End of Opponent's Turn] combo tag:
 *   Only the reveal-triggered half is implemented. `EffectTiming.SecuritySkill`
 *   effects are resolved exclusively from `GameEngine.resolveSecurityEffect`, itself
 *   only called when this card is REVEALED by a security check (GameEngine.ts ~2404-
 *   2459) — there is no code path that activates a SecuritySkill effect at any other
 *   window. The "[End of Opponent's Turn]" half of the tag — letting this card
 *   activate from the security stack even without being checked — has no engine seam:
 *   `endOfOpponentTurn`/`atEndOfOpponentTurn` exist as `SubTriggerEventName` union
 *   members (EffectContext.ts) but are never fired via `fireSubTrigger` anywhere in
 *   GameEngine.ts or TurnStateMachine.ts (confirmed by grep — zero call sites), exactly
 *   the gap BT16-074's header already documents for the same event names. So this
 *   port implements the ability as a plain [Security] "play free on reveal" effect
 *   (mirrors BT26-089's `security()` builder) and leaves the turn-based activation
 *   window as a residual gap pending that engine seam.
 *
 * Clause mapping:
 *   EffectTiming.SecuritySkill — see divergence #1 above. `ctx.fx.playFromSecurity`
 *     with `payCost: false`, exactly BT26-089's shape.
 *
 *   EffectTiming.WhenDigivolving / EffectTiming.OnEndAttack (shared body, no cap) —
 *     "By deleting this Digimon or trashing 2 bottom face-down cards from under any of
 *     your Tamers, delete 1 of your opponent's highest DP Digimon." No "[Once Per
 *     Turn]" tag is printed (unlike BT16-080's textually near-identical combo, which
 *     does carry one), so no `maxPerTurn` cap is applied — each window fires
 *     independently, matching BT16-080's structural split (two EffectTiming entries
 *     sharing one resolve body) minus its per-turn cap. The alternate cost mirrors two
 *     existing hand-written idioms: "delete this Digimon" as a self-paid cost is
 *     EX6-070's `ctx.fx.deletePermanent([selfPerm.permanentId])` + a payment check on
 *     the returned count; "trashing 2 bottom face-down cards from under any of your
 *     Tamers" reuses BT26-070's `faceDownUnderTamersPool` gather-then-group-by-host
 *     shape verbatim (that card's header cites KB Q6300/Q6301 for the identical cost
 *     phrase: the 2 cards may be spread across multiple Tamers). The controller is
 *     offered a live choice between the two costs via `ctx.ask.chooseOption` when both
 *     are payable (BT26-072's chooseOption-with-fallback shape), and the whole ability
 *     is gated optional via `ctx.ask.optional` first — "By [cost], [effect]" is always
 *     the player's choice per BT26-068's convention. The opponent's highest-DP Digimon
 *     is chosen via BT25-019's `oppHighestDpDigimons` (max-DP filter, tie-broken by
 *     `ctx.ask.chooseTargets`); re-derived AFTER the cost is paid, since paying by
 *     self-deletion cannot change the opponent's board but re-checking keeps the two
 *     cost paths symmetric and correct if that ever changes.
 *
 *   EffectTiming.OnDestroyedAnyone (onDeletion) — "Your opponent trashes 1 card in
 *     their hand" is addressed to the opponent's own seat via `ctx.ask.opponent.
 *     selectCards` (decisionApi.ts): the opponent picks which of their own hand
 *     cards is trashed, not the controller. "Then, if their hand has 7 or fewer cards, you may
 *     place this card face up as the bottom security card" re-checks the opponent's
 *     hand size AFTER the trash resolves (including when the opponent's hand was
 *     already empty, so the trash was a no-op), then offers the placement via
 *     `ctx.fx.addSecurity(ownerSeat, [instanceId], { faceUp: true })` — the exact
 *     primitive BT25-102's identical printed clause ("place this card face up as the
 *     bottom security card") documents in primitives.ts (`addSecurity`'s `faceUp`
 *     option; `toTop` defaults to false, i.e. bottom).
 */
const cardId = "BT26-082";

/** Opponent's battle-area Digimon permanents whose current DP is the group's maximum. */
function oppHighestDpDigimons(ctx: EffectContext, source: CardSource): Permanent[] {
  const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
  const digimon = Array.from(opponent.battleArea).filter(
    (p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)),
  );
  if (digimon.length === 0) return [];
  const maxDp = Math.max(...digimon.map((p) => p.currentDP));
  return digimon.filter((p) => p.currentDP === maxDp);
}

/** Every face-down card sitting under one of `seat`'s Tamers (may span multiple Tamers). */
function faceDownUnderTamersPool(
  ctx: EffectContext,
  seat: Seat,
): { hostPermanentId: string; instanceId: string }[] {
  const owner = ctx.game.player(seat);
  const pool: { hostPermanentId: string; instanceId: string }[] = [];
  for (const p of owner.battleArea) {
    if (p.inBreeding || p.topCard === undefined) continue;
    if (!ctx.game.definitionOf(p.topCard).kinds.includes(CardKind.Tamer)) continue;
    for (const card of p.stack) {
      if (!card.faceUp) pool.push({ hostPermanentId: p.permanentId, instanceId: card.instanceId });
    }
  }
  return pool;
}

/** Cost: delete this Digimon. Returns whether the cost was actually paid. */
async function paySelfDeletionCost(ctx: EffectContext): Promise<boolean> {
  const self = ctx.source.permanent();
  if (self === undefined) return false;
  const deleted = await ctx.fx.deletePermanent([self.permanentId], "byEffect");
  return deleted > 0;
}

/**
 * Cost: trash 2 bottom face-down cards from under any of the owner's Tamers, possibly
 * spread across multiple Tamers (BT26-070's identically-costed clause). Returns whether
 * 2 cards were actually trashed.
 */
async function payFaceDownTamerPoolCost(
  ctx: EffectContext,
  seat: Seat,
  pool: { hostPermanentId: string; instanceId: string }[],
): Promise<boolean> {
  if (pool.length < 2) return false;

  const chosenIds = await ctx.ask.selectCards(ctx, {
    candidates: pool.map((p) => p.instanceId),
    min: 2,
    max: 2,
  });
  if (chosenIds.length < 2) return false;

  const idsByHost = new Map<string, string[]>();
  for (const id of chosenIds) {
    const entry = pool.find((p) => p.instanceId === id);
    if (entry === undefined) continue;
    const hostIds = idsByHost.get(entry.hostPermanentId) ?? [];
    hostIds.push(id);
    idsByHost.set(entry.hostPermanentId, hostIds);
  }

  let trashedCount = 0;
  for (const [hostId, ids] of idsByHost) {
    const trashed = await ctx.fx.trashDigivolutionCards(hostId, ids);
    trashedCount += trashed.length;
  }
  return trashedCount >= 2;
}

/**
 * "By deleting this Digimon or trashing 2 bottom face-down cards from under any of
 * your Tamers, delete 1 of your opponent's highest DP Digimon." Shared by [When
 * Digivolving] and [End of Attack].
 */
async function deleteOppHighestDpViaAltCost(ctx: EffectContext, source: CardSource): Promise<void> {
  if (oppHighestDpDigimons(ctx, source).length === 0) return;

  const pool = faceDownUnderTamersPool(ctx, source.ownerSeat);
  const canPayPool = pool.length >= 2;

  const willPay = await ctx.ask.optional(
    ctx,
    "By deleting this Digimon or trashing 2 bottom face-down cards from under any of " +
      "your Tamers, delete 1 of your opponent's highest DP Digimon?",
  );
  if (!willPay) return;

  let paid: boolean;
  if (canPayPool) {
    const pick = await ctx.ask.chooseOption(ctx, [
      "Delete this Digimon",
      "Trash 2 bottom face-down cards from under your Tamers",
    ]);
    paid = pick === 0 ? await paySelfDeletionCost(ctx) : await payFaceDownTamerPoolCost(ctx, source.ownerSeat, pool);
  } else {
    paid = await paySelfDeletionCost(ctx);
  }
  if (!paid) return;

  const targets = oppHighestDpDigimons(ctx, source);
  if (targets.length === 0) return;
  const chosenId =
    targets.length === 1
      ? targets[0]!.permanentId
      : (await ctx.ask.chooseTargets(ctx, { candidates: targets.map((p) => p.permanentId), min: 1, max: 1 }))[0];
  if (chosenId === undefined) return;
  await ctx.fx.deletePermanent([chosenId], "byEffect");
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Security] [End of Opponent's Turn] Play this card without paying the cost.
    // See the module header (divergence #1): only the reveal-triggered half fires.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play-free`,
          description:
            "[Security] [End of Opponent's Turn] Play this card without paying the cost. " +
            "(Only the reveal-triggered [Security] half fires — see module header.)",
          resolve: async (ctx) => {
            await ctx.fx.playFromSecurity(ctx.source.instanceId, { payCost: false });
          },
        }),
      ];
    }

    // [When Digivolving] By deleting this Digimon or trashing 2 bottom face-down cards
    // from under any of your Tamers, delete 1 of your opponent's highest DP Digimon.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-alt-cost-delete-highest-dp`,
          description:
            "[When Digivolving] By deleting this Digimon or trashing 2 bottom face-down " +
            "cards from under any of your Tamers, delete 1 of your opponent's highest DP " +
            "Digimon.",
          optional: true,
          canActivate: (ctx) => oppHighestDpDigimons(ctx, source).length > 0,
          resolve: (ctx) => deleteOppHighestDpViaAltCost(ctx, source),
        }),
      ];
    }

    // [End of Attack] Same clause. No printed "[Once Per Turn]" tag, so no maxPerTurn
    // cap is applied — see module header.
    if (timing === EffectTiming.OnEndAttack) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/end-of-attack-alt-cost-delete-highest-dp`,
          description:
            "[End of Attack] By deleting this Digimon or trashing 2 bottom face-down " +
            "cards from under any of your Tamers, delete 1 of your opponent's highest DP " +
            "Digimon.",
          optional: true,
          when: (ctx) => {
            const self = source.permanent();
            return (
              self !== undefined &&
              (ctx.trigger.attackerPermanentId === self.permanentId ||
                ctx.trigger.defenderPermanentId === self.permanentId)
            );
          },
          canActivate: (ctx) => oppHighestDpDigimons(ctx, source).length > 0,
          resolve: (ctx) => deleteOppHighestDpViaAltCost(ctx, source),
        }),
      ];
    }

    // [On Deletion] Your opponent trashes 1 card in their hand. Then, if their hand has
    // 7 or fewer cards, you may place this card face up as the bottom security card.
    if (timing === EffectTiming.OnDestroyedAnyone) {
      return [
        onDeletion({
          source,
          effectKey: `${cardId}/on-deletion-opponent-trash-then-security`,
          description:
            "[On Deletion] Your opponent trashes 1 card in their hand. Then, if their " +
            "hand has 7 or fewer cards, you may place this card face up as the bottom " +
            "security card.",
          optional: false,
          resolve: async (ctx) => {
            const opponentSeat = ctx.game.opponentOf(source.ownerSeat);
            const handIds: string[] = Array.from(ctx.game.player(opponentSeat).hand).map(
              (c: CardInstance) => c.instanceId,
            );
            if (handIds.length > 0) {
              // "Your opponent trashes 1 card in their hand" — the opponent chooses.
              const chosen = await requireOpponentAsk(ctx).selectCards(ctx, {
                candidates: handIds,
                min: 1,
                max: 1,
              });
              if (chosen.length > 0) {
                await ctx.fx.trash(chosen);
              }
            }

            if (ctx.game.player(opponentSeat).hand.length > 7) return;

            const willPlace = await ctx.ask.optional(
              ctx,
              "Place this card face up as the bottom security card?",
            );
            if (!willPlace) return;
            await ctx.fx.addSecurity(source.ownerSeat, [ctx.source.instanceId], { faceUp: true });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
