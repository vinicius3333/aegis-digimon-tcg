import { CardKind, EffectTiming } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, staticModifier, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-041 — Hudiemon (BT26, Green/Yellow Lv.4 Digimon, Insectoid/NSp).
//
// Provisional port: no KB entry (errata/Q&A) exists yet for BT26-041 as of this port
// (`node tools/kb/query.mjs card BT26-041` returned no knowledge-base entries). Implemented
// from the printed card text only.
//
// [Digivolve] Lv.3 w/[Larva]/[Insectoid]/[NSp] trait: Cost 2 — a digivolution-cost
//   requirement, not an effect clause; carried by CardDefinition.evoCosts in cards.json.
// [On Play] [When Digivolving] Add your top security card to the hand and ＜Recovery +1＞
//   Then, you may suspend 1 Digimon.
// [Your Turn] [Once Per Turn] inherited: When this Digimon wins a battle, gain 1 memory.
//
// One clause over two windows, so both entries share a resolver (BT26-025's idiom).
// "Add your top security card to the hand" is `securityToHand(..., { fromTop: true })` and
// ＜Recovery +1＞ is `recoverToSecurity(..., 1)` — the same pairing BT26-025 uses. Both are
// mandatory; only the trailing "you may suspend 1 Digimon" is optional, and it still runs
// when the security stack was empty (the printed "Then" sequences the clauses, it does not
// make the suspend conditional on a card having been added).

const cardId = "BT26-041";

const isDigimon = (def: CardDefinition): boolean => def.kinds?.includes(CardKind.Digimon) === true;

/** Every Digimon on the battle area, either seat. Breeding-area Digimon are not targetable. */
function suspendableDigimon(ctx: EffectContext): string[] {
  const targets: string[] = [];
  for (const seat of [0, 1] as const) {
    for (const permanent of ctx.game.player(seat).battleArea) {
      if (permanent.inBreeding) continue;
      if (permanent.topCard === undefined) continue;
      if (!isDigimon(ctx.game.definitionOf(permanent.topCard))) continue;
      targets.push(permanent.permanentId);
    }
  }
  return targets;
}

/**
 * "Add your top security card to the hand and ＜Recovery +1＞ Then, you may suspend 1
 * Digimon." — shared by the [On Play] and [When Digivolving] windows.
 */
async function securityToHandRecoverThenSuspend(ctx: EffectContext, source: CardSource): Promise<void> {
  if (ctx.game.player(source.ownerSeat).security.length > 0) {
    await ctx.fx.securityToHand(source.ownerSeat, 1, { fromTop: true });
  }
  await ctx.fx.recoverToSecurity(source.ownerSeat, 1);

  const candidates = suspendableDigimon(ctx);
  if (candidates.length === 0) return;

  const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 0, max: 1 });
  if (chosen.length === 0) return;

  await ctx.fx.suspend(chosen);
}

const CLAUSE = "Add your top security card to the hand and ＜Recovery +1＞ Then, you may suspend 1 Digimon.";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-security-to-hand-recover-suspend`,
          description: `[On Play] ${CLAUSE}`,
          optional: false,
          resolve: async (ctx) => {
            await securityToHandRecoverThenSuspend(ctx, source);
          },
        }),
      ];
    }

    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-security-to-hand-recover-suspend`,
          description: `[When Digivolving] ${CLAUSE}`,
          optional: false,
          resolve: async (ctx) => {
            await securityToHandRecoverThenSuspend(ctx, source);
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/inherited-battle-won-memory`,
          description: "[Your Turn] [Once Per Turn] When this Digimon wins a battle, gain 1 memory.",
          isInherited: true,
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenBattleWon",
              sourcePermanentId: self.permanentId,
              once: false,
              oncePerTurnKey: `${cardId}/inherited-battle-won-memory`,
              description: `${cardId}: when this Digimon wins a battle, gain 1 memory`,
              matches: (subCtx) =>
                subCtx.source.isOwnersTurn() && subCtx.trigger?.subjectPermanentId === self.permanentId,
              run: async (subCtx) => {
                subCtx.fx.gainMemory(1);
              },
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
