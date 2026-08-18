import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { Permanent } from "@aegis/shared";
import { onPlay, turnTiming, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// Lui Ohwada — P-130 (White Tamer; banlist RESTRICTED to 1).
//
// Hand-written override of the declarative effect record. Both printed clauses were RawUnparsed: the
// engine now has the MovePermanent primitive (effect-driven breeding<->battle move) and a
// fired EffectTiming.OnMove, but the [Your Turn] clause is a COST-GATED optional (suspend
// this Tamer to gain memory) that the IR/interpreter route does not express, so all three
// clauses are authored here. Removing the AUTO-GENERATED header preserves this file across
// regeneration (card-module contract).
//
// Clauses:
//   1. [On Play] You may move 1 of your level 3 or higher Digimon from the breeding area to
//      the battle area (a breeding -> battle MOVE; ctx.fx.movePermanentZone fires OnMove).
//      breeding Digimon. Aegis intentionally uses an unbounded battle area.
//   2. [Your Turn] When one of your Digimon moves from the breeding area to the battle area,
//      by suspending this Tamer, gain 1 memory. Fired by the engine's OnMove timing from
//      PermanentCondition = IsPermanentExistsOnOwnerBattleAreaDigimon (documented behavior): the
//      moved permanent must be the OWNER'S battle-area Digimon — see isOwnMovedDigimon below.
//      KB Q4243: still fires if the moved Digimon is deleted on arrival (the trigger is
//      evaluated at the move, when OnMove fires synchronously, before any later deletion).
//   3. [Security] Play this Tamer without paying the cost.
//
// KB Q4242 (binding): a "Lv.-" Digimon cannot be moved by clause 1 (it can't be referenced
// by level) — enforced by the level>=3 gate below.
const cardId = "P-130";
const MIN_MOVE_LEVEL = 3;

/** The owner's lone breeding-area Digimon when it is eligible to move (level >= 3). */
function movableBreedingDigimon(ctx: EffectContext, source: CardSource): Permanent | undefined {
  const bred = ctx.game.player(source.ownerSeat).breeding;
  if (bred === undefined || bred.topCard === undefined) return undefined;
  const level = ctx.game.definitionOf(bred.topCard).level;
  if (level === undefined || level < MIN_MOVE_LEVEL) return undefined;
  return bred;
}

function isOwnMovedDigimon(ctx: EffectContext, source: CardSource): boolean {
  const movedId = ctx.trigger.movedPermanentId;
  if (movedId === undefined) return false;
  const moved = ctx.game.permanentById(movedId);
  if (moved === undefined || moved.topCard === undefined) return false;
  if (!ctx.game.player(source.ownerSeat).battleArea.includes(moved)) return false;
  return isDigimon(ctx.game.definitionOf(moved.topCard));
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [On Play] move a level-3-or-higher breeding Digimon to the battle area.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-move`,
          description:
            "[On Play] You may move 1 of your level 3 or higher Digimon from the breeding area to the battle area.",
          optional: true,
          canActivate: (ctx: EffectContext) => movableBreedingDigimon(ctx, source) !== undefined,
          resolve: async (ctx: EffectContext) => {
            const bred = movableBreedingDigimon(ctx, source);
            // MUST be awaited: movePermanentZone fires the nested EffectTiming.OnMove window
            // (this Tamer's own [Your Turn] reaction below) through GameEngine.fireTiming, which
            // stashes the move's TriggerInfo in a single shared `pendingTrigger` field for the
            // duration of that nested call. Firing this without awaiting let the outer [On Play]
            // resolution loop's next resolveTiming pass run concurrently (interleaved via the
            // microtask queue) and reset that shared field before the nested OnMove window read
            // it, losing `movedPermanentId` and silently no-opping the [Your Turn] reaction.
            if (bred) await ctx.fx.movePermanentZone(bred.permanentId, "toBattle");
          },
        }),
      ];
    }

    // [Your Turn] When one of your Digimon moves from breeding to battle, by suspending this
    // Tamer, gain 1 memory. Fired via EffectTiming.OnMove.
    if (timing === EffectTiming.OnMove) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/on-move-memory`,
          description:
            "[Your Turn] When one of your Digimon moves from the breeding area to the battle area, by suspending this Tamer, gain 1 memory.",
          optional: true,
          // [Your Turn] only AND the moved permanent must be the owner's
          // battle-area Digimon.
          when: (ctx: EffectContext) => source.isOwnersTurn() && isOwnMovedDigimon(ctx, source),
          // The suspend cost can be paid only while this Tamer is unsuspended.
          canActivate: () => {
            const self = source.permanent();
            return self !== undefined && !self.isSuspended;
          },
          resolve: async (ctx: EffectContext) => {
            const self = source.permanent();
            if (self === undefined || self.isSuspended) return;
            ctx.fx.suspend([self.permanentId]); // cost: suspend this Tamer
            ctx.fx.gainMemoryForSeat(source.ownerSeat, 1, { isTamerEffect: true });
          },
        }),
      ];
    }

    // [Security] Play this Tamer without paying the cost.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play`,
          description: "[Security] Play this card without paying the cost.",
          resolve: async (ctx: EffectContext) => {
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
