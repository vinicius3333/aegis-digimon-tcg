import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, security, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "ST22-10";

const renamonLine = ["Renamon", "Kyubimon", "Taomon", "Sakuyamon"];

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

/** Friendly Digimon with Renamon line names. */
function renamonLineIds(ctx: EffectContext, source: CardSource): string[] {
  const owner = ctx.game.player(source.ownerSeat);
  const ids: string[] = [];
  for (const p of owner.battleArea) {
    if (p.inBreeding) continue;
    const top = p.topCard;
    if (top === undefined) continue;
    if (!isDigimon(ctx.game.definitionOf(top))) continue;
    if (renamonLine.includes(ctx.game.definitionOf(top).nameEn)) ids.push(p.permanentId);
  }
  return ids;
}

/** -9000 DP to 1 chosen opponent Digimon for the turn (shared by the SecuritySkill + OnDiscardSecurity clauses). */
async function minus9000ToOpponentDigimon(ctx: EffectContext, source: CardSource): Promise<void> {
  const candidates = opponentDigimonIds(ctx, source);
  if (candidates.length === 0) return;
  const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
  if (chosen.length === 0) return;
  ctx.fx.modifyDP(chosen[0]!, -9000, EffectDuration.UntilEachTurnEnd);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // (1a) SecuritySkill: -9000 DP to 1 opponent Digimon (the card is checked from security in battle).
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-minus-9000-dp`,
          description: "[Security] 1 of your opponent's Digimon gets -9000 DP for the turn.",
          optional: false,
          canActivate: (ctx) => opponentDigimonIds(ctx, source).length >= 1,
          resolve: async (ctx) => minus9000ToOpponentDigimon(ctx, source),
        }),
      ];
    }

    // (1b) OnDiscardSecurity: when an EFFECT trashes this card from the security stack, -9000 DP to 1
    //      opponent Digimon. A distinct clause from the SecuritySkill check (documented behavior: documented behavior
    //      prevention pays its cost by trashing this card from security (KB Q5438). The engine fires
    //      this timing for the instance once it lands in trash (primitives trash/trashFromSecurity ->
    //      fireDiscardedFromSecurity).
    if (timing === EffectTiming.OnDiscardSecurity) {
      return [
        activated({
          source,
          effectKey: `${cardId}/on-discard-security-minus-9000-dp`,
          description:
            "When effects trash this card from the security stack, 1 of your opponent's Digimon gets -9000 DP for the turn.",
          optional: false,
          // The card is already loose in TRASH by the time OnDiscardSecurity fires (it fired
          // AFTER the move — see GameEngine.fireDiscardedFromSecurity). `activated`'s default
          // base guard requires NOT-in-trash, which would make this clause permanently inert;
          // `isFromTrash: true` flips it to require trash residency instead, matching where
          // this card actually sits when the window opens.
          isFromTrash: true,
          canActivate: (ctx) => opponentDigimonIds(ctx, source).length >= 1,
          resolve: async (ctx) => minus9000ToOpponentDigimon(ctx, source),
        }),
      ];
    }

    // (2) WhenRemoveField (Security AllTurns): trash this card from security
    //     to prevent a Renamon-line Digimon from leaving.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/security-prevent-leave-renamon-line`,
          description:
            "[Security] [All Turns] When any of your Digimon with [Renamon], [Kyubimon], " +
            "[Taomon] or [Sakuyamon] in their names would leave the battle area other than " +
            "by battle, by trashing this card, 1 of those Digimon doesn't leave.",
          isInherited: false,
          resolve: async (ctx) => {
            // The actual prevention is installed as a Replacement subscription via the
            // mapping to EffectTiming.None here for the static/continuous window.
            // Install a replacement that prevents a Renamon-line Digimon from leaving
            // at a cost of trashing this card.
            const self = source.permanent();
            const _selfId = self?.permanentId ?? source.instanceId;

            ctx.fx.subscribeReplacement({
              event: "wouldLeavePlay",
              description: "Prevent Renamon-line Digimon from leaving by trashing this card from security",
              mode: "prevent",
              sourcePermanentId: undefined, // from security, not from a permanent
              causeAllows: (cause, _resolvingSeat, _isBounce) => {
                return cause !== "byBattle";
              },
              protects: (_ctx, leavingPermanentId) => {
                const ids = renamonLineIds(ctx, source);
                return ids.includes(leavingPermanentId);
              },
              preventCheck: async (checkCtx, _leavingPermanentId) => {
                const wantToUse = await checkCtx.ask.optional(
                  checkCtx,
                  "Trash this card from security to prevent your Renamon-line Digimon from leaving?",
                );
                if (!wantToUse) return false;

                await checkCtx.fx.trash([source.instanceId]);
                return true; // removal prevented
              },
            });
          },
        }),
      ];
    }

    // (3) [Main] OptionSkill: Draw 1, then place this card face up as bottom security.
    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-draw-place-security`,
          description:
            "[Main] <Draw 1>. Then, place this card face up as the bottom security card.",
          optional: false,
          resolve: async (ctx) => {
            if (ctx.game.player(source.ownerSeat).deck.length >= 1) {
              await ctx.fx.draw(source.ownerSeat, 1);
            }

            await ctx.fx.addSecurity(source.ownerSeat, [source.instanceId], {
              toTop: false,
              faceUp: true,
            });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
