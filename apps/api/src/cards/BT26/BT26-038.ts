import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition, Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, whenDigivolving, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-038 — Kuwagamon (BT26, Green Lv.4 Digimon).
//
// Provisional port: no KB entry (errata/Q&A) exists yet for BT26-038 as of this port
// (`node tools/kb/query.mjs card BT26-038` returned no knowledge-base entries). implemented
// from the printed card text only; the [When Moving]/[On Play]/[When Digivolving] clause
// mirrors BT26-008's shared-resolver shape.
//
// [Digivolve] Lv.3 w/[TS] trait: Cost 2 — a digivolution-cost requirement, not an effect
//   clause; already carried by CardDefinition.evoCosts in cards.json, so it needs no
//   entry here.
// [When Moving] [On Play] [When Digivolving] You may suspend 1 Digimon. Then, 1 of your
//   Digimon with the [Insectoid] or [Titan] trait gets +3000 DP until your opponent's
//   turn ends.
// Inherited: [Your Turn] [Once Per Turn] When this Digimon wins a battle, 1 of your
//   [Insectoid] or [Titan] trait Digimon may digivolve into an [Insectoid] or [Titan]
//   trait Digimon card in the hand with the cost reduced by 1.
//   RESIDUAL: this clause needs the `whenBattleWon` SubTrigger event, which has ZERO
//   engine callers — no code path ever calls `fireSubTrigger("whenBattleWon", ...)`, so
//   a watcher subscribed to it can never fire (confirmed dead in
//   apps/api/src/cards/EX12/EX12-051.ts, which documents and omits the same clause
//   rather than installing a dead-letter watcher). Omitted here for the same reason;
//   port once the engine gains a battle-resolution caller for this event.

const cardId = "BT26-038";

function hasInsectoidOrTitan(def: CardDefinition): boolean {
  return (def.types ?? []).some((t) => t === "Insectoid" || t === "Titan");
}

function insectoidOrTitanTargets(ctx: EffectContext, source: CardSource): Permanent[] {
  const owner = ctx.game.player(source.ownerSeat);
  return Array.from(owner.battleArea).filter(
    (p) =>
      p.topCard !== undefined &&
      isDigimon(ctx.game.definitionOf(p.topCard)) &&
      hasInsectoidOrTitan(ctx.game.definitionOf(p.topCard)),
  );
}

function allDigimonInPlay(ctx: EffectContext): Permanent[] {
  const targets: Permanent[] = [];
  for (const seat of [0, 1] as const) {
    targets.push(
      ...Array.from(ctx.game.player(seat).battleArea).filter(
        (p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)),
      ),
    );
  }
  return targets;
}

/** "You may suspend 1 Digimon. Then, 1 of your [Insectoid]/[Titan] Digimon gets +3000 DP." */
async function suspendThenBuffInsectoidOrTitan(ctx: EffectContext, source: CardSource): Promise<void> {
  const suspendCandidates = allDigimonInPlay(ctx);
  if (suspendCandidates.length > 0) {
    const chosenToSuspend = await ctx.ask.chooseTargets(ctx, {
      candidates: suspendCandidates.map((p) => p.permanentId),
      min: 0,
      max: 1,
    });
    if (chosenToSuspend.length > 0) {
      await ctx.fx.suspend(chosenToSuspend);
    }
  }

  const buffTargets = insectoidOrTitanTargets(ctx, source);
  if (buffTargets.length === 0) return;

  let chosenId: string;
  if (buffTargets.length === 1) {
    chosenId = buffTargets[0]!.permanentId;
  } else {
    const chosen = await ctx.ask.chooseTargets(ctx, {
      candidates: buffTargets.map((p) => p.permanentId),
      min: 1,
      max: 1,
    });
    if (chosen.length === 0) return;
    chosenId = chosen[0]!;
  }

  ctx.fx.modifyDP(chosenId, 3000, EffectDuration.UntilOpponentTurnEnd);
}

/** Whether this card is the permanent that just moved from breeding to battle. */
function isSelfMove(ctx: EffectContext, source: CardSource): boolean {
  const movedId = ctx.trigger?.movedPermanentId;
  if (movedId === undefined) return false;
  return movedId === source.permanent()?.permanentId;
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [On Play] You may suspend 1 Digimon. Then, 1 of your [Insectoid] or [Titan] trait
    // Digimon gets +3000 DP until your opponent's turn ends.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-suspend-and-buff`,
          description:
            "[On Play] You may suspend 1 Digimon. Then, 1 of your [Insectoid] or [Titan] " +
            "trait Digimon gets +3000 DP until your opponent's turn ends.",
          optional: false,
          resolve: async (ctx) => {
            await suspendThenBuffInsectoidOrTitan(ctx, source);
          },
        }),
      ];
    }

    // [When Digivolving] Same clause.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-suspend-and-buff`,
          description:
            "[When Digivolving] You may suspend 1 Digimon. Then, 1 of your [Insectoid] or " +
            "[Titan] trait Digimon gets +3000 DP until your opponent's turn ends.",
          optional: false,
          resolve: async (ctx) => {
            await suspendThenBuffInsectoidOrTitan(ctx, source);
          },
        }),
      ];
    }

    // [When Moving] Same clause, fired when this Digimon itself moves from the
    // breeding area to the battle area (engine's OnMove window).
    if (timing === EffectTiming.OnMove) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/when-moving-suspend-and-buff`,
          description:
            "[When Moving] You may suspend 1 Digimon. Then, 1 of your [Insectoid] or " +
            "[Titan] trait Digimon gets +3000 DP until your opponent's turn ends.",
          optional: false,
          when: (ctx) => isSelfMove(ctx, source),
          resolve: async (ctx) => {
            await suspendThenBuffInsectoidOrTitan(ctx, source);
          },
        }),
      ];
    }

    // Inherited "wins a battle" clause omitted — see RESIDUAL note above.

    return [];
  },
};

registerCard(module);
export default module;
