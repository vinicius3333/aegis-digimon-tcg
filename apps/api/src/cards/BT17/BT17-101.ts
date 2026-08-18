import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { CardInstance, Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenAttacking, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT17-101 — Fenriloogamon: Takemikazuchi (BT17, Purple Lv.7 Digimon).
 *
 *
 * Effects:
 *   [Trash][Your Turn] When one of your level 6 Digimon with [Pulsemon] in its text is
 *     played, 2 of your Digimon may DNA digivolve into this card.
 *     RESIDUAL — requires whenPlayed SubTrigger subscription + isFromTrash path. The IR
 *     (SubTrigger "whenPlayed") handles this; the hand-written module cannot set up
 *     SubTrigger watchers. Left as documented residual.
 *   [When Digivolving] 1 of your opponent's Digimon gets -16000 DP for the turn. If DNA
 *     digivolving, you may set the memory to 3 on your opponent's side. Then, if this
 *     Digimon has a Tamer in its digivolution cards, gain 1 memory and <Recovery +1 (Deck)>.
 *   [When Attacking] By trashing the top card of your security stack, trash the top card
 *     of your opponent's security stack.
 *
 * KB Q2900: [Trash] triggers at the timing when this card is in the trash and a qualifying
 *   Digimon is played.
 * KB Q4712: The Tamer condition for memory+Recovery fires even if the DNA condition is not met.
 *
 * DNA digivolution requirements:
 *   Materials: 1 × [Fenriloogamon] + 1 × [Kazuchimon] — both on your battle area.
 */

const cardId = "BT17-101";

function hasTamerInDigivolution(perm: Permanent, ctx: EffectContext): boolean {
  return perm.stack.some((c: CardInstance) => {
    const def = ctx.game.definitionOf(c);
    return (def.kinds as string[]).includes("Tamer");
  });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [When Digivolving]
    //   1. 1 of your opponent's Digimon gets -16000 DP for the turn.
    //   2. If DNA digivolving, you MAY set the memory to 3 on your opponent's side.
    //   3. If this Digimon has a Tamer in its digivolution cards, gain 1 memory.
    //   4. If this Digimon has a Tamer in its digivolution cards, gain <Recovery +1 (Deck)>.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving`,
          description:
            "[When Digivolving] 1 of your opponent's Digimon gets -16000 DP for the turn. " +
            "If DNA digivolving, you may set the memory to 3 on your opponent's side. " +
            "Then, if this Digimon has a Tamer in its digivolution cards, gain 1 memory " +
            "and <Recovery +1 (Deck)>.",
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (!self) return;
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            const oppPlayer = ctx.game.player(opponent);

            // 1. -16000 DP to 1 opponent Digimon.
            const oppDigimon = Array.from(oppPlayer.battleArea).filter(
              (p: Permanent) =>
                p.topCard !== undefined &&
                (ctx.game.definitionOf(p.topCard).kinds as string[]).includes("Digimon"),
            );
            if (oppDigimon.length > 0) {
              const chosen = await ctx.ask.chooseTargets(ctx, {
                candidates: oppDigimon.map((p: Permanent) => p.permanentId),
                min: 1,
                max: 1,
              });
              if (chosen.length > 0) {
                ctx.fx.modifyDP(chosen[0]!, -16000, EffectDuration.UntilEachTurnEnd);
              }
            }

            // 2. If DNA digivolving, you may set the memory to 3 on your opponent's side.
            if (ctx.trigger?.isDnaDigivolve) {
              const willSet = await ctx.ask.optional(ctx, "Set the memory to 3 on your opponent's side?");
              if (willSet) {
                // SetFixedMemory is raise-only: only applies if opponent currently has < 3.
                // memory < 0 means opponent has it; -memory is opponent's amount.
                // We want: if opponent's memory < 3, set it to 3 → memory = -3.
                const opponentMemory = -ctx.game.state.memory;
                if (opponentMemory < 3) {
                  ctx.fx.setMemory(-3);
                }
              }
            }

            // 3+4. If this Digimon has a Tamer in its digivolution cards, gain 1 memory
            //       and <Recovery +1 (Deck)>.
            // KB Q4712: these fire regardless of the DNA condition.
            if (hasTamerInDigivolution(self, ctx)) {
              // [When Digivolving] can be reached via an effect-driven (reactive) digivolve
              // on the opponent's turn -- credit this card's controller explicitly.
              ctx.fx.gainMemoryForSeat(source.ownerSeat, 1);
              ctx.fx.grantKeyword(self.permanentId, "Recovery", EffectDuration.Permanent, 1);
            }
          },
        }),
      ];
    }

    // [When Attacking] By trashing the top card of your security stack, trash the top
    // card of your opponent's security stack.
    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/when-attacking-trash-security`,
          description:
            "[When Attacking] By trashing the top card of your security stack, trash the " +
            "top card of your opponent's security stack.",
          optional: true,
          when: (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            return owner.security.length >= 1;
          },
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const willTrash = await ctx.ask.optional(
              ctx,
              "Trash the top card of your security stack to trash the top of opponent's?",
            );
            if (!willTrash) return;
            // Trash top of own security.
            await ctx.fx.trashFromSecurity(source.ownerSeat, 1, { fromTop: true });
            // Trash top of opponent's security.
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            await ctx.fx.trashFromSecurity(opponent, 1, { fromTop: true });
          },
        }),
      ];
    }

    return [];
  },
  // RESIDUAL: [Trash][Your Turn] When one of your level 6 Digimon with [Pulsemon] in its text
  // is played, 2 of your Digimon may DNA digivolve into this card. Requires whenPlayed SubTrigger
  // subscription + isFromTrash path, not available in hand-written EffectModule.
};

registerCard(module);
export default module;
