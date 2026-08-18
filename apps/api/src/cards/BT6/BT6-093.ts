import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT6-093 — Sistermon (BT6, Red Option).
 *
 * [Main] 1 of your Digimon with [Huckmon] in its name or [Royal Knight] in its
 * type can attack your opponent's unsuspended Digimon for the turn.
 *
 * [Security] You may play 1 Digimon card with [Sistermon] in its name from your
 * hand or trash without paying its memory cost. Then, add this card to your hand.
 */
const cardId = "BT6-093";

const ROYAL_KNIGHT = "Royal Knight";

function canAttackUnsuspended(def: CardDefinition): boolean {
  if (!isDigimon(def)) return false;
  if (def.nameEn.includes("Huckmon")) return true;
  const traits = def.types as string[] | undefined;
  return traits?.includes(ROYAL_KNIGHT) ?? false;
}

function isSistermonDigimon(def: CardDefinition): boolean {
  if (!isDigimon(def)) return false;
  return def.nameEn.includes("Sistermon");
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const out: Effect[] = [];

    // [Main] Grant can-attack-unsuspended
    if (timing === EffectTiming.OnUseOption) {
      out.push(
        activated({
          source,
          effectKey: `${cardId}/main-attack-unsuspended`,
          description:
            "[Main] 1 of your Digimon with [Huckmon] or [Royal Knight] type can attack your opponent's unsuspended Digimon for the turn.",
          when: (ctx) => {
            return ctx.game.player(source.ownerSeat).battleArea.some((p) => {
              const def = ctx.game.definitionOf(p.topCard);
              return def && canAttackUnsuspended(def);
            });
          },
          resolve: async (ctx) => {
            const candidates = ctx.game
              .player(source.ownerSeat)
              .battleArea.filter((p) => {
            const def = ctx.game.definitionOf(p.topCard);
              return def && canAttackUnsuspended(def);
            })
            .map((p) => p.permanentId);
            if (candidates.length === 0) return;
            const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
            if (chosen.length === 0) return;
            ctx.fx.grantCanAttackUnsuspended(
              chosen[0]!,
              EffectDuration.UntilEachTurnEnd,
            );
          },
        }),
      );
    }

    // [Security] Play Sistermon + add to hand
    if (timing === EffectTiming.SecuritySkill) {
      out.push(
        security({
          source,
          effectKey: `${cardId}/security-play-sistermon`,
          description:
            "[Security] You may play 1 [Sistermon] Digimon from your hand or trash without paying cost. Then, add this card to your hand.",
          resolve: async (ctx) => {
            const hand = ctx.game.player(source.ownerSeat).hand;
            const trash = ctx.game.player(source.ownerSeat).trash;
            const handCands = hand.filter((c) =>
              isSistermonDigimon(ctx.game.definitionOf(c)),
            );
            const trashCands = trash.filter((c) =>
              isSistermonDigimon(ctx.game.definitionOf(c)),
            );
            const hasHand = handCands.length > 0;
            const hasTrash = trashCands.length > 0;

            if (!hasHand && !hasTrash) {
              await ctx.fx.returnToHand([source.instanceId]);
              return;
            }

            let fromHand = hasHand;
            if (hasHand && hasTrash) {
              const choice = await ctx.ask.chooseOption(ctx, ["From hand", "From trash"]);
              fromHand = choice === 0;
            }

            const candidates = fromHand
              ? handCands.map((c) => c.instanceId)
              : trashCands.map((c) => c.instanceId);

            if (candidates.length === 0) {
              await ctx.fx.returnToHand([source.instanceId]);
              return;
            }

            const selected = await ctx.ask.selectCards(ctx, { candidates, min: 0, max: 1 });
            if (selected.length > 0) {
              await ctx.fx.playInstances(selected, { payCost: false });
            }
            await ctx.fx.returnToHand([source.instanceId]);
          },
        }),
      );
    }

    return out;
  },
};

registerCard(module);
export default module;
