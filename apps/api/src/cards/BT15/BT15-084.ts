import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { security, staticModifier, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT15-084 — Kari Kamiya (BT15, Yellow Tamer).
 *
 *
 * Printed text:
 *   When an effect trashes this card from the security stack, 1 of your opponent's Digimon
 *   gains SecurityAttack-1 (This Digimon checks 1 fewer security card) until the end of
 *   their turn.
 *   [Start of Your Turn] If you have 2 memory or less, set your memory to 3.
 *   [All Turns] When an effect removes cards from your security stack, by suspending this
 *   Tamer, 1 of your opponent's Digimon gains SecurityAttack-1 (This Digimon checks 1 fewer
 *   security card) until the end of their turn.
 *   [Security] Play this Tamer without paying its memory cost.
 *
 * KB rulings (binding):
 *   Q2583: "when an effect trashes this card from the security stack" fires only when THIS
 *          card is DIRECTLY trashed from security (not revealed, not searched). A card played
 *          from security is also removed from security, triggering Q6240.
 *   Q6240: If this card is played from the security stack by an effect, the [All Turns]
 *          "when an effect removes cards from your security stack" WILL trigger.
 *
 * Clause mapping:
 *   EffectTiming.OnDiscardSecurity — fires when THIS card is trashed from security BY AN
 *     EFFECT. Raw Effect (no on-field base guard — the card is in security when trashing fires).
 *     Effect: select 1 opponent Digimon; grant SecurityAttack -1 until opponent's turn end.
 *
 *   EffectTiming.OnStartTurn — [Start of Your Turn]: if memory <= 2, set memory to 3.
 *     Uses turnTiming builder (on-field base guard applies; must be on battle area).
 *
 *   EffectTiming.None — [All Turns] static continuous: installs a whenEffectRemovesFromSecurity
 *     watcher via subscribeSubTrigger.
 *     matches: ctx.trigger.removedFromSecuritySeat === source.ownerSeat (own security stack).
 *     Cost in run: suspend this Tamer (already-suspended → can't pay → return early).
 *     Effect in run: select 1 opponent Digimon; grant SecurityAttack -1 until opponent's turn end.
 *     Anchored to this Tamer's permanentId (subscription clears when the Tamer leaves play).
 *     Per Q6240: both "trashed from security" and "played from security" fire
 *     whenEffectRemovesFromSecurity in the engine, so a single watcher captures both seams.
 *
 *   EffectTiming.SecuritySkill — [Security] Play this Tamer without paying its memory cost.
 */
const cardId = "BT15-084";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // When an effect trashes this card from the security stack: grant opponent's Digimon
    // SecurityAttack -1 until end of their turn.
    //
    // The card is in the security stack (not on the battle area) when this fires, so the
    // standard on-field base guard must NOT apply here. Raw Effect literal is used.
    if (timing === EffectTiming.OnDiscardSecurity) {
      return [
        {
          effectKey: `${cardId}/when-trashed-from-security`,
          description:
            "When an effect trashes this card from the security stack, 1 of your opponent's " +
            "Digimon gains SecurityAttack-1 until the end of their turn.",
          optional: false,
          isInherited: false,
          isSecurity: false,
          isLinked: false,
          maxPerTurn: -1,
          canTrigger: (_ctx) => true,
          canActivate: (_ctx) => true,
          resolve: async (ctx) => {
            const opponentSeat = ctx.game.opponentOf(source.ownerSeat);
            const candidates = ctx.game
              .player(opponentSeat)
              .battleArea.filter((p) => !p.inBreeding && p.topCard !== undefined)
              .map((p) => p.permanentId);

            if (candidates.length === 0) return;

            const chosen = await ctx.ask.chooseTargets(ctx, {
              candidates,
              min: 1,
              max: 1,
            });
            if (chosen.length === 0) return;

            ctx.fx.grantKeyword(
              chosen[0]!,
              "SecurityAttack",
              EffectDuration.UntilOpponentTurnEnd,
              -1,
            );
          },
        },
      ];
    }

    // [Start of Your Turn] If you have 2 memory or less, set your memory to 3.
    if (timing === EffectTiming.OnStartTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-of-your-turn-set-memory`,
          description: "[Start of Your Turn] If you have 2 memory or less, set your memory to 3.",
          optional: false,
          when: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            if (!ctx.source.isOwnersTurn()) return false;
            return (ctx.game.state.memory ?? 0) <= 2;
          },
          resolve: async (ctx) => {
            if ((ctx.game.state.memory ?? 0) <= 2) {
              ctx.fx.setMemory(3);
            }
          },
        }),
      ];
    }

    // [All Turns] When an effect removes cards from your security stack, by suspending this
    // Tamer, 1 of your opponent's Digimon gains SecurityAttack -1 until end of their turn.
    //
    // Installed as a continuous static watcher anchored on this Tamer's permanentId.
    // Subscription fires whenever removedFromSecuritySeat === source.ownerSeat (own stack).
    // Per Q6240: both the trashFromSecurity and playFromSecurity seams fire
    // whenEffectRemovesFromSecurity, so a single watcher captures both.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/all-turns-suspend-security-attack`,
          description:
            "[All Turns] When an effect removes cards from your security stack, by suspending " +
            "this Tamer, 1 of your opponent's Digimon gains SecurityAttack-1 until the end of " +
            "their turn.",
          optional: false,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;

            ctx.fx.subscribeSubTrigger({
              event: "whenEffectRemovesFromSecurity",
              sourcePermanentId: self.permanentId,
              once: false,
              description: `${cardId}: when effect removes from own security → suspend self, grant SecurityAttack-1`,
              matches: (subCtx) =>
                subCtx.trigger.removedFromSecuritySeat === source.ownerSeat,
              run: async (subCtx) => {
                // Guard: Tamer must still be on the battle area.
                if (!subCtx.source.isOnBattleArea()) return;

                const tamer = subCtx.source.permanent();
                if (tamer === undefined) return;

                // Cost: suspend this Tamer. Already-suspended → can't pay → skip.
                if (tamer.isSuspended) return;
                await subCtx.fx.suspend([tamer.permanentId]);

                // Effect: select 1 opponent Digimon; grant SecurityAttack -1.
                const opponentSeat = subCtx.game.opponentOf(source.ownerSeat);
                const candidates = subCtx.game
                  .player(opponentSeat)
                  .battleArea.filter((p) => !p.inBreeding && p.topCard !== undefined)
                  .map((p) => p.permanentId);

                if (candidates.length === 0) return;

                const chosen = await subCtx.ask.chooseTargets(subCtx, {
                  candidates,
                  min: 1,
                  max: 1,
                });
                if (chosen.length === 0) return;

                subCtx.fx.grantKeyword(
                  chosen[0]!,
                  "SecurityAttack",
                  EffectDuration.UntilOpponentTurnEnd,
                  -1,
                );
              },
            });
          },
        }),
      ];
    }

    // [Security] Play this Tamer without paying its memory cost.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play-self`,
          description: "[Security] Play this Tamer without paying its memory cost.",
          optional: false,
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
