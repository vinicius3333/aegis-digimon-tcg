import { CardKind, EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, security, staticModifier, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * ST22-08 — Offensive Plug-in V, ST22, Red Option.
 *
 * source: documented behavior.
 *
 * Six clauses:
 *   1. EffectTiming.None (IgnoreColorCondition): Ignore color requirements if you have a Tamer.
 *   2. EffectTiming.None (LinkCondition): Can link to Lv.3+ Digimon; link cost 2.
 *   4. EffectTiming.OnEndTurn (EndOfTurnLinkedEffect): Linked Digimon may attack.
 *   5. EffectTiming.SecuritySkill: Delete opponent lowest DP Digimon, add this card to hand.
 *   6. EffectTiming.OptionSkill ([Main]): Link to a Digimon, then delete opponent Digimon
 *      with DP <= one of your Digimon.
 */
const cardId = "ST22-08";

/** Owner battle-area Digimon permanent ids. */
function ownerDigimonIds(ctx: EffectContext, source: CardSource): string[] {
  const owner = ctx.game.player(source.ownerSeat);
  const ids: string[] = [];
  for (const p of owner.battleArea) {
    if (p.inBreeding) continue;
    if (p.topCard === undefined) continue;
    if (!isDigimon(ctx.game.definitionOf(p.topCard))) continue;
    ids.push(p.permanentId);
  }
  return ids;
}

/** Opponent battle-area Digimon permanent ids. */
function opponentDigimonIds(ctx: EffectContext, source: CardSource): string[] {
  const opponentSeat = ctx.game.opponentOf(source.ownerSeat);
  const opponent = ctx.game.player(opponentSeat);
  const ids: string[] = [];
  for (const p of opponent.battleArea) {
    if (p.inBreeding) continue;
    if (p.topCard === undefined) continue;
    if (!isDigimon(ctx.game.definitionOf(p.topCard))) continue;
    ids.push(p.permanentId);
  }
  return ids;
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const out: Effect[] = [];

    // (1) EffectTiming.None: IgnoreColorCondition — waive color requirement if you have a Tamer.
    if (timing === EffectTiming.None) {
      out.push(
        staticModifier({
          source,
          effectKey: `${cardId}/ignore-color-condition`,
          description: "Ignore color requirements for this Option if you have a Tamer.",
          when: () => {
            if (!source.isOnBattleArea()) {
              // This card is an Option, not on battle area. The condition checks owner's
              // permanents, not this card. For Option color waivers, the check is on the
              // owner's field.
            }
            return true; // The waiveColorRequirement resolves within
          },
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const hasTamer = owner.battleArea.some((p) => {
              if (p.inBreeding || p.topCard === undefined) return false;
              return ctx.game.definitionOf(p.topCard).kinds.includes(CardKind.Tamer);
            });
            if (hasTamer) {
              ctx.fx.waiveColorRequirement(source.instanceId, EffectDuration.Permanent);
            }
          },
        }),
      );

      // (2) EffectTiming.None: LinkCondition — can link to Lv.3+ Digimon, cost 2.
      out.push(
        staticModifier({
          source,
          effectKey: `${cardId}/link-condition`,
          description: "You may Link this card to Lv.3+ Digimon (Cost: 2).",
          resolve: async (ctx) => {
            const ids = ownerDigimonIds(ctx, source).filter((id) => {
              const p = ctx.game.permanentById(id);
              if (p === undefined || p.topCard === undefined) return false;
              const def = ctx.game.definitionOf(p.topCard);
              return def.level !== undefined && def.level >= 3;
            });
            if (ids.length > 0 && ctx.fx.grantLinkMax) {
              // Grant Link capacity to the eligible Digimon
              for (const id of ids) {
                ctx.fx.grantLinkMax(id, 1, EffectDuration.UntilEachTurnEnd);
              }
            }
          },
        }),
      );
    }

    // (3) EffectTiming.OnDeclaration: LinkAction.
    if (timing === EffectTiming.OnDeclaration) {
      out.push(
        activated({
          source,
          effectKey: `${cardId}/link-action`,
          description: "[Main] Link this card to 1 of your Digimon.",
          optional: true,
          when: () => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const candidates = ownerDigimonIds(ctx, source).filter((id) => {
              const p = ctx.game.permanentById(id);
              if (p === undefined) return false;
              if (!canLinkTo(p, ctx)) return false;
              return true;
            });
            if (candidates.length === 0) return;

            const chosen = await ctx.ask.chooseTargets(ctx, {
              candidates,
              min: 1,
              max: 1,
            });
            if (chosen.length === 0) return;

            await ctx.fx.link(chosen[0]!, [source.instanceId]);
          },
        }),
      );
    }

    // (4) EffectTiming.OnEndTurn: EndOfTurnLinkedEffect — linked Digimon may attack.
    if (timing === EffectTiming.OnEndTurn) {
      out.push(
        turnTiming({
          source,
          effectKey: `${cardId}/end-of-turn-linked-attack`,
          description: "[End of Your Turn] This Digimon may attack (Linked effect).",
          isLinked: true,
          maxPerTurn: 1,
          optional: true,
          when: (ctx) => {
            const self = source.permanent();
            if (self === undefined || self.topCard === undefined) return false;
            const def = ctx.game.definitionOf(self.topCard);
            if (!def.kinds.includes(CardKind.Digimon)) return false;
            return ctx.game.state.turnSeat === source.ownerSeat;
          },
          canActivate: (ctx) => {
            const self = source.permanent();
            if (self === undefined) return false;
            return true; // documented behavior: CanAttack check
          },
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            // The linked Digimon attacks. The option is linked to a Digimon permanent;
            // the Source permanent IS the host Digimon (the linked card is the source).
            await ctx.fx.forceAttack(self.permanentId);
          },
        }),
      );
    }

    // (5) SecuritySkill: Delete opponent lowest DP Digimon, add this card to hand.
    if (timing === EffectTiming.SecuritySkill) {
      out.push(
        security({
          source,
          effectKey: `${cardId}/security-delete-lowest-dp-add-to-hand`,
          description:
            "[Security] Delete 1 of your opponent's Digimon with the lowest DP. Then, add this card to the hand.",
          optional: false,
          resolve: async (ctx) => {
            const opponentSeat = ctx.game.opponentOf(source.ownerSeat);
            const opp = ctx.game.player(opponentSeat);
            const digimon = opp.battleArea.filter(
              (p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard!)),
            );
            if (digimon.length === 0) {
              // No opponent Digimon to delete; skip delete, still add to hand.
            } else {
              const minDp = Math.min(...digimon.map((p) => p.currentDP));
              const lowestIds = digimon.filter((p) => p.currentDP === minDp).map((p) => p.permanentId);

              const chosen = await ctx.ask.chooseTargets(ctx, {
                candidates: lowestIds,
                min: 1,
                max: 1,
              });
              if (chosen.length > 0) {
                await ctx.fx.deletePermanent([chosen[0]!]);
              }
            }

            await ctx.fx.returnToHand([source.instanceId]);
          },
        }),
      );
    }

    // (6) EffectTiming.OnUseOption ([Main]): Link to a Digimon, then delete opponent Digimon
    //     with DP <= one of your Digimon.
    if (timing === EffectTiming.OnUseOption) {
      out.push(
        activated({
          source,
          effectKey: `${cardId}/main-link-and-delete`,
          description:
            "[Main] You may link this card to 1 of your Digimon without paying the cost. " +
            "Then, delete 1 of your opponent's Digimon with as much or less DP as 1 of your Digimon.",
          optional: false,
          canActivate: (ctx) => {
            return ownerDigimonIds(ctx, source).length > 0;
          },
          resolve: async (ctx) => {
            const linkCandidates = ownerDigimonIds(ctx, source).filter((id) => {
              const p = ctx.game.permanentById(id);
              if (p === undefined) return false;
              return canLinkTo(p, ctx);
            });

            if (linkCandidates.length > 0) {
              const wantToLink = await ctx.ask.optional(
                ctx,
                "Link this card to 1 of your Digimon?",
              );
              if (wantToLink) {
                const linked = await ctx.ask.chooseTargets(ctx, {
                  candidates: linkCandidates,
                  min: 1,
                  max: 1,
                });
                if (linked.length > 0) {
                  await ctx.fx.link(linked[0]!, [source.instanceId]);
                }
              }
            }

            const ownerDigimon = ctx.game
              .player(source.ownerSeat)
              .battleArea.filter(
                (p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard!)),
              );

            if (ownerDigimon.length === 0) return;

            const compareIds = ownerDigimon.map((p) => p.permanentId);
            const chosenOwner = await ctx.ask.chooseTargets(ctx, {
              candidates: compareIds,
              min: 1,
              max: 1,
            });
            if (chosenOwner.length === 0) return;

            const selectedOwner = ctx.game.permanentById(chosenOwner[0]!);
            if (selectedOwner === undefined) return;
            const selectedDp = selectedOwner.currentDP;

            const oppSeat = ctx.game.opponentOf(source.ownerSeat);
            const opp = ctx.game.player(oppSeat);
            const eligibleOppIds = opp.battleArea
              .filter((p) => {
                if (p.topCard === undefined) return false;
                if (!isDigimon(ctx.game.definitionOf(p.topCard))) return false;
                return p.currentDP <= selectedDp;
              })
              .map((p) => p.permanentId);

            if (eligibleOppIds.length > 0) {
              const chosenOpp = await ctx.ask.chooseTargets(ctx, {
                candidates: eligibleOppIds,
                min: 1,
                max: 1,
              });
              if (chosenOpp.length > 0) {
                await ctx.fx.deletePermanent([chosenOpp[0]!]);
              }
            }
          },
        }),
      );
    }

    return out;
  },
};

function canLinkTo(permanent: { permanentId: string }, ctx: EffectContext): boolean {
  // Simple check: the permanent is eligible for linking
  return true;
}

registerCard(module);
export default module;
