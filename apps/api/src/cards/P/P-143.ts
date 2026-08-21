import { EffectTiming, EffectDuration } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { turnTiming, whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// Drimogemon — P-143 (Green Lv.4 Digimon).
//
// Hand-written override of the declarative effect record. The AUTO-GENERATED stub left this card
// non-executable ("coverage": "none"): it dropped the inherited ＜Piercing＞ (the IR
// records the keyword on a Static effect, but the interpreter only runs
// `effect.actions`, never `effect.keywords`, so a keyword-only Static is a silent
// no-op), and emitted the [End of Your Turn] move clause as RawUnparsed. Removing the
// AUTO-GENERATED header preserves this file
// across regeneration (card-module contract + the file-header convention).
//
// NOTE: this card is NOT an Option — it is a Green Digimon (the "option" mechanic brief
//
// Two clauses:
//   1. [End of Your Turn] [Once Per Turn] You may place this Digimon to the empty space
//      in your breeding area (a battle-area -> breeding-area MOVE of this permanent).
//   2. Inherited (ESS) ＜Piercing＞.
const cardId = "P-143";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [End of Your Turn] [Once Per Turn] You may place this Digimon to the empty space
    // in your breeding area.
    //
    //   CardObjectController.MovePermanent(thisPermanent -> breeding) guarded by CanMove.
    //
    // KB (query.mjs card P-143) confirms this is a genuine zone MOVE of the existing
    // permanent (identity, digivolution stack, and suspended state all preserved), NOT a
    // delete/re-play:
    //   - Q4251: digivolution cards are NOT trashed when it moves to breeding.
    //   - Q4250: ＜Overflow＞ in its digivolution cards is NOT processed (the card is "not
    //     removed from the area").
    //   - Q4256/Q4257: a suspended Digimon stays suspended after the move (and unsuspends
    //     in its owner's next unsuspend phase).
    //   - Q4252/Q4254: effects targeting it keep targeting it but stop affecting it while
    //     it is in the breeding area.
    //
    // Wired via the `movePermanentZone` effect primitive (the MovePermanent IR action's
    // battle <-> breeding move): it relocates the whole permanent (top + stack + linked)
    // into the empty breeding slot, preserving identity, digivolution stack, and suspended
    // state — NOT a delete/replay, so no trash, no ＜Overflow＞, no deletion/play timings
    // (Q4250/Q4251/Q4256/Q4257). This override remains hand-authored only because the
    // generated stub also drops the inherited ＜Piercing＞ (a keyword-only Static is a
    // silent no-op in the interpreter); the move clause itself is now a normal primitive.
    if (timing === EffectTiming.OnEndTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/eot-move-to-breeding`,
          description:
            "[End of Your Turn] [Once Per Turn] You may place this Digimon to the empty space in your breeding area.",
          optional: true,
          maxPerTurn: 1,
          when: () => source.isOnBattleArea() && source.isOwnersTurn(),
          // PlayerState.breeding, undefined when empty).
          canActivate: (ctx: EffectContext) => {
            if (!source.isOnBattleArea()) return false;
            const owner = ctx.game.player(source.ownerSeat);
            return owner.breeding === undefined;
          },
          resolve: async (ctx: EffectContext) => {
            // Battle-area -> breeding-area MOVE of this whole permanent (top + stack +
            // linked), preserving identity, digivolution stack, and suspended state — no
            // trash, no <Overflow>, no deletion/replay (KB Q4250/Q4251/Q4256/Q4257).
            const self = source.permanent();
            if (self) ctx.fx.movePermanentZone(self.permanentId, "toBreeding");
          },
        }),
      ];
    }

    // Inherited (ESS): this Digimon has ＜Piercing＞.
    if (timing === EffectTiming.OnDetermineDoSecurityCheck) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/pierce`,
          description:
            "＜Piercing＞ (When attacking, if this Digimon deletes the opponent's Digimon in battle, it also performs a security check.)",
          isInherited: true,
          optional: false,
          resolve: async (ctx: EffectContext) => {
            const self = source.permanent();
            if (self) ctx.fx.grantPierce(self.permanentId, EffectDuration.UntilEndBattle);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
