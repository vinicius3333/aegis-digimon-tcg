import { CardKind, EffectDuration, EffectTiming } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { security, staticModifier, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { cardHasTrait } from "../../engine/cards/cardData.js";

/**
 * BT18-088 — Takuya Kanbara & Koji Minamoto (BT18, Red Tamer).
 *
 *
 * [Security] Play this Tamer without paying its memory cost.
 *
 * [Start of Your Turn] If your memory is at 2 or less, set it to 3.
 *
 * [Start of Your Main Phase] You may place up to 1 [Hybrid] trait card with different
 *   names from your trash under this Tamer. For each of your other Tamers, add 2 to the
 *   maximum number of cards this effect may place (Q3045).
 *
 * [Rule Text] This card is also treated as having [Takuya Kanbara] and [Koji Minamoto]
 *   in its name.
 *
 * [Inherited Effect][End of Your Turn][Once Per Turn] When this Digimon has the
 *   [Hybrid]/[Ten Warriors] trait, it may attack a player.
 *
 * KB rulings (binding):
 *   Q3045: max = 1 + 2×(other Tamers); must have different names.
 *   Q3046: Can't attack if another attack is already in progress.
 *   Q2927: The [End of Your Turn] inherited effect fires at the end of the turn timing.
 *
 *   SecuritySkill -> PlaySelfTamerSecurityEffect.
 *   OnStartTurn -> SetMemoryTo3TamerEffect (if memory ≤ 2, set to 3).
 *   OnStartMainPhase -> place up to (1 + 2*other Tamers) [Hybrid] trait cards from trash
 *     with different names under this Tamer.
 *   EffectTiming.None -> rule implementation (also treated as Takuya Kanbara / Koji Minamoto).
 *   OnEndTurn (IsOwnerTurn, isInherited, card.PermanentOfThisCard.TopCard.HasHybridTenWarriorsTraits)
 *     -> this Digimon may attack a player (no Digimon target: defenderCondition: _ => false).
 */
const cardId = "BT18-088";

const hasHybridOrTenWarriors = (def: CardDefinition): boolean =>
  cardHasTrait(def, "Hybrid") || cardHasTrait(def, "Ten Warriors");

const hasHybridTrait = (def: CardDefinition): boolean => cardHasTrait(def, "Hybrid");

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Security] Play this Tamer without paying its memory cost.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play-self`,
          description: "[Security] Play this Tamer without paying its memory cost.",
          optional: false,
          resolve: async (ctx) => {
            await ctx.fx.playFromSecurity(source.instanceId, { payCost: false });
          },
        }),
      ];
    }

    // [Start of Your Turn] If memory ≤ 2, set it to 3.
    if (timing === EffectTiming.OnStartTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-of-your-turn-set-memory`,
          description: "[Start of Your Turn] If your memory is at 2 or less, set it to 3.",
          optional: false,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.game.state.turnSeat === source.ownerSeat,
          canActivate: (ctx) => ctx.game.state.memory <= 2,
          resolve: async (ctx) => {
            if (ctx.game.state.memory <= 2) {
              ctx.fx.setMemory(3);
            }
          },
        }),
      ];
    }

    // [Start of Your Main Phase] Place up to (1 + 2*other Tamers) [Hybrid] cards from trash
    // under this Tamer (different names only).
    if (timing === EffectTiming.OnStartMainPhase) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-of-main-phase-place-hybrid`,
          description:
            "[Start of Your Main Phase] You may place up to 1 [Hybrid] trait card with " +
            "different names from your trash under this Tamer. For each of your other Tamers, " +
            "add 2 to the maximum number of cards this effect may place.",
          optional: true,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.game.state.turnSeat === source.ownerSeat,
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const owner = ctx.game.player(source.ownerSeat);
            return owner.trash.some((c) => hasHybridTrait(ctx.game.definitionOf(c)));
          },
          resolve: async (ctx) => {
            const selfPermanent = ctx.source.permanent();
            if (!selfPermanent) return;

            const owner = ctx.game.player(source.ownerSeat);
            // Count other Tamers in play.
            const otherTamerCount = owner.battleArea.filter(
              (perm) =>
                !perm.inBreeding &&
                perm.topCard !== undefined &&
                perm.permanentId !== selfPermanent.permanentId &&
                (ctx.game.definitionOf(perm.topCard).kinds as string[]).includes(CardKind.Tamer),
            ).length;

            const maxCount = 1 + 2 * otherTamerCount;

            // Iteratively pick cards with different names.
            const selectedInstanceIds: string[] = [];
            const selectedNames = new Set<string>();

            for (let slot = 0; slot < maxCount; slot++) {
              // Rebuild candidate pool excluding already-selected names.
              const pool = owner.trash.filter((c) => {
                if (!hasHybridTrait(ctx.game.definitionOf(c))) return false;
                if (selectedInstanceIds.includes(c.instanceId)) return false;
                const def = ctx.game.definitionOf(c);
                // Exclude cards whose name overlaps with any already selected name.
                const names = [def.nameEn];
                return !names.some((n) => selectedNames.has(n));
              });

              if (pool.length === 0) break;

              const picks = await ctx.ask.selectCards(ctx, {
                candidates: pool.map((c) => c.instanceId),
                min: 0,
                max: 1,
              });
              if (picks.length === 0) break;

              const pickedId = picks[0]!;
              selectedInstanceIds.push(pickedId);
              const pickedCard = owner.trash.find((c) => c.instanceId === pickedId);
              if (pickedCard) {
                const def = ctx.game.definitionOf(pickedCard);
                selectedNames.add(def.nameEn);
              }
            }

            if (selectedInstanceIds.length > 0) {
              await ctx.fx.placeUnder(selfPermanent.permanentId, selectedInstanceIds);
            }
          },
        }),
      ];
    }

    // [Rule Text] Also treated as [Takuya Kanbara] and [Koji Minamoto].
    // Continuous name grant re-derived each static pass.
    if (timing === EffectTiming.None) {
      const effects: Effect[] = [
        staticModifier({
          source,
          effectKey: `${cardId}/rule-also-treated-as-takuya-koji`,
          description:
            "[Rule Text] This card is also treated as having [Takuya Kanbara] and " +
            "[Koji Minamoto] in its name.",
          optional: false,
          when: (ctx) => {
            // Fires whether on field or in hand/digivolution.
            const selfPermanent = ctx.source.permanent();
            return selfPermanent !== undefined;
          },
          resolve: async (ctx) => {
            const selfPermanent = ctx.source.permanent();
            if (!selfPermanent) return;
            ctx.fx.grantNameTrait(
              selfPermanent.permanentId,
              "name",
              ["Takuya Kanbara", "Koji Minamoto"],
              EffectDuration.Permanent,
            );
          },
        }),

        // [Inherited Effect][End of Your Turn][Once Per Turn] If this Digimon has [Hybrid]/[Ten Warriors]
        // trait, it may attack a player.
        staticModifier({
          source,
          effectKey: `${cardId}/ess-end-of-your-turn-attack-player`,
          description:
            "[Inherited Effect][End of Your Turn][Once Per Turn] If this Digimon has the " +
            "[Hybrid]/[Ten Warriors] trait, it may attack a player.",
          optional: false,
          isInherited: true,
          maxPerTurn: 1,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const selfPermanent = ctx.source.permanent();
            if (!selfPermanent) return;
            ctx.fx.subscribeSubTrigger({
              event: "endOfTurn",
              sourcePermanentId: selfPermanent.permanentId,
              once: false,
              oncePerTiming: true,
              description:
                `${cardId} [Inherited][End of Your Turn][Once Per Turn] ` +
                "Digimon with [Hybrid/Ten Warriors] may attack a player",
              matches: (subCtx) => {
                // Must be owner's turn.
                if (subCtx.game.state.turnSeat !== source.ownerSeat) return false;
                // The source permanent (the Digimon that has this card in its stack) must be
                // on the battle area and its top card must have [Hybrid]/[Ten Warriors].
                const perm = subCtx.game.permanentById(selfPermanent.permanentId);
                if (!perm || perm.inBreeding || !perm.topCard) return false;
                const topDef = subCtx.game.definitionOf(perm.topCard);
                return hasHybridOrTenWarriors(topDef);
              },
              run: async (subCtx) => {
                const perm = subCtx.game.permanentById(selfPermanent.permanentId);
                if (!perm) return;
                // forceAttack drives the attack; the combat system enforces player-only
                await subCtx.fx.forceAttack(perm.permanentId);
              },
            });
          },
        }),
      ];
      return effects;
    }

    return [];
  },
};

registerCard(module);
export default module;
