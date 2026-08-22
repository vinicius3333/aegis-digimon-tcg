import { EffectTiming, isDigimon } from "@aegis/shared";
import type { Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenDigivolving, onDeletion } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT9-081 — Purple Lv.6 Digimon (BT9, DexDorugoramon).
//
// Digivolve: 2 from [Dorugoramon]
// [When Digivolving] If this Digimon has [Dorugoramon] in its digivolution cards or is
//   digivolving from the trash, delete all of your opponent's Digimon with the lowest level.
// [On Deletion] You may play 1 purple or black level 3 Digimon from your trash without paying
//   its memory cost. If you have 5 or more cards with [Dex] or [DeathX] in their names in your
//   trash, you may ALSO play 1 [DeathXmon] from your trash without paying its cost instead.
//
// The "digivolutionRequirement" is structural and not re-handled here.

const cardId = "BT9-081";

function hasDorugoramonInStack(ctx: EffectContext, source: CardSource): boolean {
  const perm = source.permanent();
  if (perm === undefined) return false;
  return Array.from(perm.stack).some((card) =>
    ctx.game.definitionOf(card).nameEn === "Dorugoramon",
  );
}

function isDigivolvingFromTrash(ctx: EffectContext): boolean {
  return ctx.trigger.digivolvedFromZone === "trash";
}

function oppMinLevelDigimons(
  ctx: EffectContext,
  source: CardSource,
): Permanent[] {
  const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
  const digimons = Array.from(opponent.battleArea).filter((p) => {
    if (p.topCard == null) return false;
    return isDigimon(ctx.game.definitionOf(p.topCard));
  });
  if (digimons.length === 0) return [];
  const minLevel = Math.min(...digimons.map((p) => ctx.game.definitionOf(p.topCard!).level ?? 99));
  return digimons.filter((p) => (ctx.game.definitionOf(p.topCard!).level ?? 99) === minLevel);
}

function onDeletionCandidates(ctx: EffectContext, source: CardSource) {
  const owner = ctx.game.player(source.ownerSeat);
  const dexCount = Array.from(owner.trash).filter((card) => {
    const name = ctx.game.definitionOf(card).nameEn;
    return name.includes("Dex") || name.includes("DeathX");
  }).length;

  return Array.from(owner.trash).filter((card) => {
    const def = ctx.game.definitionOf(card);
    if (!isDigimon(def)) return false;
    if (def.level === 3 && (def.colors.includes("Purple" as never) || def.colors.includes("Black" as never))) return true;
    return dexCount >= 5 && def.nameEn === "DeathXmon";
  });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-delete`,
          description:
            "[When Digivolving] If this Digimon has [Dorugoramon] in its digivolution cards " +
            "or is digivolving from the trash, delete all of your opponent's Digimon with the lowest level.",
          canActivate: (ctx) => {
            if (!hasDorugoramonInStack(ctx, source) && !isDigivolvingFromTrash(ctx)) return false;
            return oppMinLevelDigimons(ctx, source).length > 0;
          },
          resolve: async (ctx) => {
            const targets = oppMinLevelDigimons(ctx, source);
            if (targets.length > 0) {
              await ctx.fx.deletePermanent(
                targets.map((p) => p.permanentId),
                "byEffect",
              );
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnDestroyedAnyone) {
      return [
        onDeletion({
          source,
          effectKey: `${cardId}/on-deletion-play`,
          description:
            "[On Deletion] You may play 1 purple or black level 3 Digimon from your trash " +
            "without paying its memory cost. If you have 5 or more cards with [Dex] or [DeathX] " +
            "in their names in your trash, you may play 1 [DeathXmon] from your trash instead.",
          optional: true,
          canActivate: (ctx) => onDeletionCandidates(ctx, source).length > 0,
          resolve: async (ctx) => {
            const candidates = onDeletionCandidates(ctx, source);

            if (candidates.length === 0) return;

            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: candidates.map((c) => c.instanceId),
              min: 0,
              max: 1,
            });

            if (chosen.length > 0) {
              await ctx.fx.playInstances(chosen, { payCost: false });
            }
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
