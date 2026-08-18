import { CardKind, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, staticModifier, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";


const cardId = "BT16-056";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // (1) [On Play] — place opponent Vaccine Digimon top card to their security
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-topcard-to-security`,
          description:
            "[On Play] You may place the top card of 1 of your opponent's " +
            "[Vaccine] trait Digimon on top of their security stack.",
          optional: true,
          canActivate: (ctx) => hasOpponentVaccineDigimonWithStack(ctx, source),
          resolve: async (ctx) => {
            await resolveTopCardToSecurity(ctx, source);
          },
        }),
      ];
    }

    // (2) [When Digivolving] — same as On Play
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-topcard-to-security`,
          description:
            "[When Digivolving] You may place the top card of 1 of your opponent's " +
            "[Vaccine] trait Digimon on top of their security stack.",
          optional: true,
          when: (ctx) => ctx.source.isOnBattleArea(),
          canActivate: (ctx) => hasOpponentVaccineDigimonWithStack(ctx, source),
          resolve: async (ctx) => {
            await resolveTopCardToSecurity(ctx, source);
          },
        }),
      ];
    }

    // (3) [All Turns][Once Per Turn] — trash top/bottom of opponent security on add
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/all-turns-trash-security-on-add`,
          description:
            "[All Turns][Once Per Turn] When a card is added to your opponent's " +
            "security stack, if they have 3 or more security cards, trash the top or " +
            "bottom card of their security stack.",
          maxPerTurn: 1,
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;

            ctx.fx.subscribeSubTrigger({
              event: "whenAddSecurity",
              sourcePermanentId: self.permanentId,
              once: false,
              oncePerTurnKey: `${cardId}/all-turns-trash-security-on-add`,
              description:
                "[All Turns][Once Per Turn] Trash top or bottom of opponent security.",
              matches: (subCtx) => {
                // with player=>player==card.Owner.Enemy AND opponent security >= 3
                const addedSeat = subCtx.trigger?.addedToSecuritySeat;
                const oppSeat = subCtx.game.opponentOf(source.ownerSeat);
                if (addedSeat !== oppSeat) return false;
                const oppSecurity = subCtx.game.player(oppSeat).security;
                return oppSecurity.length >= 3;
              },
              run: async (subCtx) => {
                const oppSeat = subCtx.game.opponentOf(source.ownerSeat);
                const oppSecurity = subCtx.game.player(oppSeat).security;

                if (oppSecurity.length < 3) return;

                const choices = ["Security Top", "Security Bottom"];
                const choiceIdx = await subCtx.ask.chooseOption(subCtx, choices);
                const fromTop = choiceIdx === 0;

                subCtx.fx.trashFromSecurity(oppSeat, 1, { fromTop });
              },
            });
          },
        }),
      ];
    }

    return [];
  },
};

/**
 * Resolve the top-card-to-security effect (shared by OnPlay and WhenDigivolving).
 */
async function resolveTopCardToSecurity(
  ctx: EffectContext,
  source: CardSource,
): Promise<void> {
  const oppSeat = ctx.game.opponentOf(source.ownerSeat);
  const oppPlayer = ctx.game.player(oppSeat);

  const candidates = oppPlayer.battleArea.filter((p) => {
    if (p.inBreeding) return false;
    if (p.topCard === undefined) return false;
    const def = ctx.game.definitionOf(p.topCard);
    if (!def.kinds.includes(CardKind.Digimon)) return false;
    // Must have at least 1 digivolution card
    if (p.stack.length === 0) return false;
    if (!def.attributes?.includes("Vaccine")) return false;
    return true;
  });

  if (candidates.length === 0) return;

  const chosen = await ctx.ask.chooseTargets(ctx, {
    candidates: candidates.map((p) => p.permanentId),
    min: 1,
    max: 1,
  });
  if (chosen.length === 0) return;

  const selected = ctx.game.permanentById(chosen[0]!);
  if (selected === undefined || selected.topCard === undefined) return;
  if (selected.stack.length === 0) return;

  const topCard = selected.topCard;
  const stackCards = [...selected.stack];

  // Remove the top card from the permanent and promote the bottom-most stack card
  // (the base card) as the new top. The digivolution cards between are trashed.
  // This approximates RemoveDigivolveRootEffect: strip digivolution sources, keep base.
  const newTop = stackCards.shift()!; // bottom-most = base card (stack.length >= 1 guarded)
  selected.topCard = newTop;
  selected.stack.clear();

  // Recompute DP from the new top
  const newDef = ctx.game.definitionOf(newTop);
  const dp = newDef.kinds.includes(CardKind.Digimon) ? newDef.dp : 0;
  selected.baseDP = dp;
  selected.currentDP = dp;

  // Trash the digivolution cards that were between top and base
  if (stackCards.length > 0) {
    await ctx.fx.trash(stackCards.map((c) => c.instanceId));
  }

  // Place the removed top card into opponent's trash so addSecurity can find it
  topCard.faceUp = false;
  oppPlayer.trash.push(topCard);

  // Add the card to the opponent's security stack (top)
  await ctx.fx.addSecurity(oppSeat, [topCard.instanceId], { toTop: true });
}

/** documented behavior — at least one opponent Vaccine Digimon with digivolution cards. */
function hasOpponentVaccineDigimonWithStack(
  ctx: EffectContext,
  source: CardSource,
): boolean {
  const oppSeat = ctx.game.opponentOf(source.ownerSeat);
  const oppPlayer = ctx.game.player(oppSeat);
  return oppPlayer.battleArea.some((p) => {
    if (p.inBreeding) return false;
    if (p.topCard === undefined) return false;
    const def = ctx.game.definitionOf(p.topCard);
    if (!def.kinds.includes(CardKind.Digimon)) return false;
    if (p.stack.length === 0) return false;
    if (!def.attributes?.includes("Vaccine")) return false;
    return true;
  });
}

registerCard(module);
export default module;
