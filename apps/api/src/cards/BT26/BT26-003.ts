import { CardKind, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-003 — Kyaromon (BT26, Black In-Training Digi-Egg).
//
// Provisional port: no KB entry (errata/Q&A) exists yet for BT26-003 as of this port
// (`node tools/kb/query.mjs card BT26-003` returned no knowledge-base entries). implemented
// from the printed card text only.
//
// Inherited Effect:
//   [Opponent's Turn] [Once Per Turn] When one of your opponent's Digimon attacks, by
//   trashing the bottom face-down card from under any of your Tamers, change the attack
//   target to 1 of your [Glowing Dawn] trait Digimon.
//
// Modeled on BT19-078's inherited "[Opponent's Turn]" attack watcher (EffectTiming.OnAllyAttack
// + the whenAttacking builder + isInherited: true + ctx.fx.redirectAttack), and on
// BT25-088/BT25-090's `tamerWithFaceDownUnder` cost helper for "trashing the bottom face-down
// card from under any of your Tamers" (trashDigivolutionCards on the chosen Tamer's bottom
// stack card). Unlike BT19-078 (which has no "may" and is gated only by an optional cost),
// this card's redirect is likewise driven purely by whether the (optional) cost gets paid —
// there is no separate "may" on the redirect itself, so once the cost is paid the target
// change is mandatory (mirrors the BeforePayCost cost-gate precedents' shape).
//
// `runTiming` collects OnAllyAttack candidates from BOTH players' zones (resolution.ts), so the
// card itself must confirm the attacker belongs to the OPPONENT — added via `when`, which
// BT19-078/BT26-004 omit (their own `when` is implicit through canActivate targets that happen
// to only exist on the relevant side); this port checks the attacker's controller explicitly to
// avoid firing on the owner's own attacks.

const cardId = "BT26-003";

/** This seat's battle-area Tamers with >= 1 face-down digivolution card underneath (the cost pool). */
function tamerWithFaceDownUnder(ctx: EffectContext, source: CardSource): string[] {
  const owner = ctx.game.player(source.ownerSeat);
  return owner.battleArea
    .filter((p) => {
      if (p.inBreeding || p.topCard === undefined) return false;
      const def = ctx.game.definitionOf(p.topCard);
      if (!def.kinds.includes(CardKind.Tamer)) return false;
      return p.stack.some((c) => !c.faceUp);
    })
    .map((p) => p.permanentId);
}

/** This seat's battle-area [Glowing Dawn] trait Digimon (the redirect targets). */
function glowingDawnDigimonTargets(ctx: EffectContext, source: CardSource): string[] {
  const owner = ctx.game.player(source.ownerSeat);
  return owner.battleArea
    .filter((p) => {
      if (p.inBreeding || p.topCard === undefined) return false;
      const def = ctx.game.definitionOf(p.topCard);
      return isDigimon(def) && (def.types ?? []).includes("Glowing Dawn");
    })
    .map((p) => p.permanentId);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/opponent-attacks-redirect-to-glowing-dawn`,
          description:
            "[Opponent's Turn] [Once Per Turn] When one of your opponent's Digimon attacks, " +
            "by trashing the bottom face-down card from under any of your Tamers, change the " +
            "attack target to 1 of your [Glowing Dawn] trait Digimon.",
          isInherited: true,
          maxPerTurn: 1,
          when: (ctx) => {
            const attackerId = ctx.trigger.attackerPermanentId;
            if (attackerId === undefined) return false;
            const attacker = ctx.game.permanentById(attackerId);
            return attacker !== undefined && attacker.controllerSeat !== source.ownerSeat;
          },
          canActivate: (ctx) =>
            tamerWithFaceDownUnder(ctx, source).length > 0 &&
            glowingDawnDigimonTargets(ctx, source).length > 0,
          resolve: async (ctx) => {
            const tamerIds = tamerWithFaceDownUnder(ctx, source);
            const digimonTargets = glowingDawnDigimonTargets(ctx, source);
            if (tamerIds.length === 0 || digimonTargets.length === 0) return;

            const wantToPay = await ctx.ask.optional(
              ctx,
              "Trash the bottom face-down card from under a Tamer to change the attack target?",
            );
            if (!wantToPay) return;

            let chosenTamerId: string;
            if (tamerIds.length === 1) {
              chosenTamerId = tamerIds[0]!;
            } else {
              const chosen = await ctx.ask.chooseTargets(ctx, {
                candidates: tamerIds,
                min: 1,
                max: 1,
              });
              if (chosen.length === 0) return;
              chosenTamerId = chosen[0]!;
            }

            const tamerPerm = ctx.game.permanentById(chosenTamerId);
            if (tamerPerm === undefined || tamerPerm.stack.length === 0) return;

            const bottomCard = tamerPerm.stack[tamerPerm.stack.length - 1];
            if (bottomCard === undefined || bottomCard.faceUp) return;

            await ctx.fx.trashDigivolutionCards(chosenTamerId, [bottomCard.instanceId]);

            await ctx.fx.redirectAttack(digimonTargets);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
