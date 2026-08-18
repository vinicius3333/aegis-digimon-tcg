import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { security, staticModifier, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT26-094 — Keenan Crier (BT26, Purple Tamer).
 *
 * BT26 is a new set with no source documented behavior reference and no knowledge-base entries yet
 * (`node tools/kb/query.mjs card BT26-094` returns no errata/Q&A/rules hits), so this
 * port is provisional: it follows the printed text directly and mirrors the closest
 * existing hand-written cards for each clause shape. Re-check against the KB once
 * BT26 rulings are scraped.
 *
 * Printed text:
 *   [Start of Your Main Phase] By placing 1 [DATA SQUAD] card from your hand face down
 *   under this Tamer, ＜Draw 1＞ and gain 1 memory.
 *   [Your Turn] When your opponent's hand is trashed from or effects trash cards from
 *   under this Tamer, by suspending this Tamer, 1 of your [DATA SQUAD] trait Digimon
 *   gains ＜Execute＞ for the turn.
 *   [Security] Play this card without paying the cost.
 *
 * Clause mapping:
 *   EffectTiming.OnStartMainPhase — cost-then-benefit, identically shaped to BT26-089's
 *     and BT26-091's "[Start of Your Main Phase] By placing 1 [trait] card from your
 *     hand under this Tamer, Draw 1 and gain 1 memory." Placement uses ctx.fx.placeUnder
 *     (the existing "face down under a permanent" primitive). No new primitive needed.
 *
 *   EffectTiming.None — [Your Turn] static: installs TWO SubTrigger watchers anchored to
 *     this Tamer, because the printed "or" joins two disjoint engine events, mirroring
 *     BT26-089's/BT26-091's dual-watcher shape:
 *       - `whenHandTrashed`, gated to `handTrashedSeat === opponentSeat` (BT25-084/
 *         BT26-059's producer: fires once per trash-from-hand ACTION regardless of card
 *         count, KB Q6400/Q6401), for "your opponent's hand is trashed from".
 *       - `whenDigivolutionTrashed` (primitives.ts `trashDigivolutionCards` — the same
 *         event BT26-091/EX1-020/ST24-14 watch), gated to
 *         `subjectPermanentId === self.permanentId`, for "effects trash cards from under
 *         this Tamer" (cards placed face down under a Tamer via `ctx.fx.placeUnder` sit
 *         in the same `permanent.stack` digivolution-cards field this event covers).
 *     Both watchers run the shared cost+benefit: "by suspending this Tamer" is the
 *     mandatory cost (paid only when this Tamer is unsuspended), and "1 of your [DATA
 *     SQUAD] trait Digimon gains ＜Execute＞ for the turn" is the benefit — modeled on
 *     BT4-098's `ctx.fx.grantKeyword(target, "SecurityAttack", EffectDuration.
 *     UntilEachTurnEnd, 1)` "for the turn" grant, here for the boolean ＜Execute＞ keyword
 *     (no amount).
 *
 *   EffectTiming.SecuritySkill — [Security] Play this card without paying the cost.
 */
const cardId = "BT26-094";

function hasDataSquadTrait(def: CardDefinition): boolean {
  return (def.types ?? []).includes("DATA SQUAD");
}

/**
 * Shared mandatory cost for the [Your Turn] clause: suspend this Tamer. Returns whether
 * the cost was paid (false when already suspended — the ability then does nothing,
 * including the Execute grant).
 */
async function suspendSelf(ctx: EffectContext): Promise<boolean> {
  const self = ctx.source.permanent();
  if (self === undefined || self.isSuspended) return false;
  await ctx.fx.suspend([self.permanentId]);
  return true;
}

/** Benefit: 1 of the owner's [DATA SQUAD] trait Digimon gains <Execute> for the turn. */
async function grantExecuteToDataSquadDigimon(ctx: EffectContext, source: CardSource): Promise<void> {
  const owner = ctx.game.player(source.ownerSeat);
  const candidates = owner.battleArea
    .filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)) && hasDataSquadTrait(ctx.game.definitionOf(p.topCard)))
    .map((p) => p.permanentId);
  if (candidates.length === 0) return;

  const chosen =
    candidates.length === 1 ? candidates : await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
  if (chosen.length === 0) return;

  ctx.fx.grantKeyword(chosen[0]!, "Execute", EffectDuration.UntilEachTurnEnd);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Start of Your Main Phase] By placing 1 [DATA SQUAD] card from your hand face down
    // under this Tamer, <Draw 1> and gain 1 memory.
    if (timing === EffectTiming.OnStartMainPhase) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main-place-data-squad-draw-memory`,
          description:
            "[Start of Your Main Phase] By placing 1 [DATA SQUAD] card from your hand " +
            "face down under this Tamer, <Draw 1> and gain 1 memory.",
          optional: true,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          canActivate: (ctx) => {
            const owner = ctx.game.player(ctx.source.ownerSeat);
            return owner.hand.some((c) => hasDataSquadTrait(ctx.game.definitionOf(c)));
          },
          resolve: async (ctx) => {
            const selfPerm = ctx.source.permanent();
            if (selfPerm === undefined) return;

            const owner = ctx.game.player(ctx.source.ownerSeat);
            const candidates = owner.hand.filter((c) => hasDataSquadTrait(ctx.game.definitionOf(c))).map((c) => c.instanceId);
            if (candidates.length === 0) return;

            const chosen = await ctx.ask.selectCards(ctx, {
              candidates,
              min: 0,
              max: 1,
            });
            if (chosen.length === 0) return;

            await ctx.fx.placeUnder(selfPerm.permanentId, chosen);
            await ctx.fx.draw(source.ownerSeat, 1);
            ctx.fx.gainMemory(1);
          },
        }),
      ];
    }

    // [Your Turn] When your opponent's hand is trashed from or effects trash cards from
    // under this Tamer, by suspending this Tamer, 1 of your [DATA SQUAD] trait Digimon
    // gains <Execute> for the turn. See the module header for the two watchers.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/your-turn-opponent-hand-or-under-trashed-grant-execute`,
          description:
            "[Your Turn] When your opponent's hand is trashed from or effects trash " +
            "cards from under this Tamer, by suspending this Tamer, 1 of your [DATA " +
            "SQUAD] trait Digimon gains <Execute> for the turn.",
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;

            const opponentSeat = ctx.game.opponentOf(source.ownerSeat);

            ctx.fx.subscribeSubTrigger({
              event: "whenHandTrashed",
              sourcePermanentId: self.permanentId,
              once: false,
              description: `${cardId}: opponent's hand trashed -> suspend self, grant Execute to a [DATA SQUAD] Digimon`,
              matches: (subCtx) => {
                if (!subCtx.source.isOwnersTurn()) return false;
                return subCtx.trigger.handTrashedSeat === opponentSeat;
              },
              run: async (subCtx) => {
                const paid = await suspendSelf(subCtx);
                if (!paid) return;
                await grantExecuteToDataSquadDigimon(subCtx, source);
              },
            });

            ctx.fx.subscribeSubTrigger({
              event: "whenDigivolutionTrashed",
              sourcePermanentId: self.permanentId,
              once: false,
              description: `${cardId}: cards trashed from under this Tamer -> suspend self, grant Execute to a [DATA SQUAD] Digimon`,
              matches: (subCtx) => {
                if (!subCtx.source.isOwnersTurn()) return false;
                return subCtx.trigger.subjectPermanentId === self.permanentId;
              },
              run: async (subCtx) => {
                const paid = await suspendSelf(subCtx);
                if (!paid) return;
                await grantExecuteToDataSquadDigimon(subCtx, source);
              },
            });
          },
        }),
      ];
    }

    // [Security] Play this card without paying the cost.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play-free`,
          description: "[Security] Play this card without paying the cost.",
          resolve: async (ctx) => {
            await ctx.fx.playFromSecurity(ctx.source.instanceId, { payCost: false });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
