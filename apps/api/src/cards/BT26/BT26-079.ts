import { EffectDuration, EffectTiming, isDigimon, type CardInstance } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, whenDigivolving, whenAttacking, staticModifier, activated } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { requireOpponentAsk } from "../../engine/decisions/decisionApi.js";

/**
 * BT26-079 — ZombiePlutomon (BT26, Purple Lv.6 Digimon).
 *
 * Q7109 confirms that [Trash] effects can only be activated while the card is in the trash;
 * Q7110 confirms that Assembly can further reduce this card's play cost; and Q7111 confirms
 * that each player chooses the cards trashed from their own hand.
 *
 * Printed text:
 *   [Digivolve] [Plutomon]: Cost 1
 *   [Digivolve] Lv.5 w/[TS] trait: Cost 3
 *   [Assembly -2] [Plutomon]
 *   [Trash] [Main] If your hand has 5 or fewer cards, play this card with the cost
 *     reduced by 4.
 *   ＜Security A. +1＞
 *   ＜Decode ([Plutomon])＞
 *   ＜Retaliation＞
 *   [On Play] [When Digivolving] [When Attacking] By trashing 1 card in your hand, delete
 *     1 of your opponent's level 6 or lower Digimon.
 *   [All Turns] [Once Per Turn] When any of your opponent's Digimon are played or
 *     digivolve, both players trash cards in their hand so that they have 4 left.
 *
 * Clause mapping:
 *   EffectTiming.None — ＜Security A. +1＞/＜Retaliation＞ static grants (`hasKeyword` on
 *     the continuous ledger, not the printed-text scan, is what combat legality actually
 *     reads — BT5-085/BT12-063 precedent). ＜Decode ([Plutomon])＞ installs an optional
 *     `wouldLeavePlay`/`instead` replacement: on every non-battle leave it may play a
 *     [Plutomon] from this Digimon's digivolution cards for free without preventing the
 *     original leave (Comprehensive Rules §16-36 and the BT19-024 engine precedent).
 *   EffectTiming.OnPlay / EffectTiming.WhenDigivolving / EffectTiming.OnAllyAttack — "By
 *     trashing 1 card in your hand, delete 1 of your opponent's level 6 or lower Digimon."
 *     The trash is the (declinable) cost; only paying it enables the delete.
 *   EffectTiming.None (staticModifier, `maxPerTurn: 1`) — "[All Turns] [Once Per Turn]
 *     When any of your opponent's Digimon are played or digivolve, both players trash
 *     cards in their hand so that they have 4 left." `subscribeSubTrigger` on both
 *     `whenPlayed` and `whenOneOfYoursDigivolves`, `matches` narrowed to the OPPONENT
 *     controlling the subject permanent (both events fire unconditionally for either
 *     seat — GameEngine.ts, ST21-09 IR precedent — so the seat filter must live in
 *     `matches`, not the event name). The hand-written subscriptions explicitly share one
 *     stable `oncePerTurnKey`, so the play and digivolve paths consume one turn budget.
 *   EffectTiming.OnDeclaration (`activated`, `isFromTrash: true`) — "[Trash][Main] If your
 *     hand has 5 or fewer cards, play this card with the cost reduced by 4." The printed
 *     `[Trash]` tag means this card can be PLAYED DIRECTLY FROM THE
 *     TRASH during the Main phase (confirmed against the identically shaped BT24-076's
 *     compiled IR, whose `isFromTrash: true` / `PlayWithoutCost` action with `from:
 *     ["trash"]` encodes exactly this), but `isFromTrash` was never consumed at runtime
 *     and `GameEngine.findInstance` never scanned the trash zone, so there was no way to
 *     even TARGET the card for activation. Both are now fixed: `findInstance` locates a
 *     trash-resident loose card, and the `activated` builder's base guard requires
 *     `ctx.source.isInTrash()` for an `isFromTrash`-flagged effect (and EXCLUDES trash
 *     residency for every other `[Main]` effect, so this does not leak onto an
 *     on-field ability). The body plays the source instance from the trash via
 *     `ctx.fx.playInstances` (zone-agnostic — it locates the loose instance wherever it
 *     sits) with `payCost: true, costDelta: 4`, matching `playInstances`'s documented
 *     reduced-cost-play contract (primitives.ts).
 */
const cardId = "BT26-079";

/** "By trashing 1 card in your hand, delete 1 of your opponent's level 6 or lower Digimon." */
async function resolveTrashCostDelete(ctx: EffectContext, source: CardSource): Promise<void> {
  const owner = ctx.game.player(source.ownerSeat);
  const handIds = Array.from(owner.hand).map((c) => c.instanceId);
  if (handIds.length === 0) return;

  const toTrash = await ctx.ask.selectCards(ctx, { candidates: handIds, min: 0, max: 1 });
  if (toTrash.length === 0) return;
  await ctx.fx.trash(toTrash);

  const opponent = ctx.game.opponentOf(source.ownerSeat);
  const candidates = ctx.game
    .player(opponent)
    .battleArea.filter((p) => {
      if (p.inBreeding || p.topCard === undefined) return false;
      const def = ctx.game.definitionOf(p.topCard);
      return isDigimon(def) && (def.level ?? 99) <= 6;
    })
    .map((p) => p.permanentId);
  if (candidates.length === 0) return;
  const chosen =
    candidates.length === 1 ? candidates[0]! : (await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 }))[0];
  if (chosen !== undefined) await ctx.fx.deletePermanent([chosen]);
}

/** "Both players trash cards in their hand so that they have 4 left." */
async function resolveBothTrashDownTo4(ctx: EffectContext, source: CardSource): Promise<void> {
  for (const seat of [source.ownerSeat, ctx.game.opponentOf(source.ownerSeat)]) {
    const player = ctx.game.player(seat);
    const overflow = player.hand.length - 4;
    if (overflow <= 0) continue;
    const candidates = Array.from(player.hand).map((c) => c.instanceId);
    const isControllerSeat = seat === source.ownerSeat;
    const picked = isControllerSeat
      ? await ctx.ask.selectCards(ctx, { candidates, min: overflow, max: overflow })
      : await requireOpponentAsk(ctx).selectCards(ctx, { candidates, min: overflow, max: overflow });
    if (picked.length > 0) await ctx.fx.trash(picked);
  }
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/security-attack`,
          description: "＜Security A. +1＞",
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self !== undefined)
              ctx.fx.grantKeyword(self.permanentId, "SecurityAttack", EffectDuration.UntilEachTurnEnd, 1);
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/retaliation`,
          description: "＜Retaliation＞",
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self !== undefined)
              ctx.fx.grantKeyword(self.permanentId, "Retaliation", EffectDuration.UntilEachTurnEnd);
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/decode-plutomon`,
          description:
            "＜Decode ([Plutomon])＞ (When this Digimon would leave the battle area other than " +
            "in battle, you may play 1 [Plutomon] from its digivolution cards without paying the cost.)",
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeReplacement({
              event: "wouldLeavePlay",
              sourcePermanentId: self.permanentId,
              mode: "instead",
              description: `${cardId}: Decode ([Plutomon])`,
              causeAllows: (cause) => cause !== "byBattle",
              appliesTo: (_subCtx, leavingPermanentId) => leavingPermanentId === self.permanentId,
              apply: async (subCtx) => {
                const candidates = self.stack.filter((card: CardInstance) => {
                  const def = subCtx.game.definitionOf(card);
                  return isDigimon(def) && def.nameEn.includes("Plutomon");
                });
                if (candidates.length === 0) return;
                const chosen = await subCtx.ask.selectCards(subCtx, {
                  candidates: candidates.map((card) => card.instanceId),
                  min: 0,
                  max: 1,
                  visibleCards: candidates.map(({ instanceId, cardId: id }) => ({ instanceId, cardId: id })),
                });
                if (chosen.length > 0) await subCtx.fx.playInstances(chosen, { payCost: false });
              },
            });
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/all-turns-opponent-play-or-digivolve-trash-down`,
          description:
            "[All Turns] [Once Per Turn] When any of your opponent's Digimon are played or " +
            "digivolve, both players trash cards in their hand so that they have 4 left.",
          maxPerTurn: 1,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;

            const isOpponentSubject = (subCtx: EffectContext): boolean => {
              const subjectId = subCtx.trigger?.subjectPermanentId;
              if (subjectId === undefined) return false;
              const subject = subCtx.game.permanentById(subjectId);
              if (subject === undefined || subject.controllerSeat === source.ownerSeat || subject.topCard === undefined)
                return false;
              return isDigimon(subCtx.game.definitionOf(subject.topCard));
            };

            ctx.fx.subscribeSubTrigger({
              event: "whenPlayed",
              sourcePermanentId: self.permanentId,
              oncePerTurnKey: `${cardId}/all-turns-opponent-play-or-digivolve-trash-down`,
              once: false,
              description: `${cardId}: opponent Digimon played -> both trash down to 4.`,
              matches: isOpponentSubject,
              run: async (subCtx) => resolveBothTrashDownTo4(subCtx, source),
            });
            ctx.fx.subscribeSubTrigger({
              event: "whenOneOfYoursDigivolves",
              sourcePermanentId: self.permanentId,
              oncePerTurnKey: `${cardId}/all-turns-opponent-play-or-digivolve-trash-down`,
              once: false,
              description: `${cardId}: opponent Digimon digivolves -> both trash down to 4.`,
              matches: isOpponentSubject,
              run: async (subCtx) => resolveBothTrashDownTo4(subCtx, source),
            });
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-trash-cost-delete`,
          description:
            "[On Play] [When Digivolving] [When Attacking] By trashing 1 card in your hand, " +
            "delete 1 of your opponent's level 6 or lower Digimon.",
          optional: false,
          resolve: async (ctx) => resolveTrashCostDelete(ctx, source),
        }),
      ];
    }

    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-trash-cost-delete`,
          description:
            "[On Play] [When Digivolving] [When Attacking] By trashing 1 card in your hand, " +
            "delete 1 of your opponent's level 6 or lower Digimon.",
          optional: false,
          resolve: async (ctx) => resolveTrashCostDelete(ctx, source),
        }),
      ];
    }

    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/when-attacking-trash-cost-delete`,
          description:
            "[On Play] [When Digivolving] [When Attacking] By trashing 1 card in your hand, " +
            "delete 1 of your opponent's level 6 or lower Digimon.",
          optional: false,
          resolve: async (ctx) => resolveTrashCostDelete(ctx, source),
        }),
      ];
    }

    if (timing === EffectTiming.OnDeclaration) {
      return [
        activated({
          source,
          effectKey: `${cardId}/trash-main-play-with-cost-reduced`,
          description:
            "[Trash] [Main] If your hand has 5 or fewer cards, play this card with the cost " + "reduced by 4.",
          optional: true,
          isFromTrash: true,
          canActivate: (ctx) => ctx.game.player(ctx.source.ownerSeat).hand.length <= 5,
          resolve: async (ctx) => {
            await ctx.fx.playInstances([ctx.source.instanceId], { payCost: true, costDelta: 4 });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
