import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, turnTiming, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-018 — Sangomon (BT26, Blue Lv.3 Digimon).
//
// Provisional port: no KB entry (errata/Q&A) exists yet for BT26-018 as of this port
// (`node tools/kb/query.mjs card BT26-018` returned no knowledge-base entries). implemented
// from the printed card text only.
//
// [Digivolve] Lv.2 blue: Cost 0 — a digivolution-cost requirement, not an effect clause;
//   already carried by CardDefinition.evoCosts in cards.json and read directly by the
//   engine's digivolution logic, so it needs no entry here. (The card's printed
//   [Digivolve] header text is garbled in the source data; per instructions it is
//   ignored here and was already corrected centrally.)
// [When Moving] [On Play] Reveal the top 3 cards of your deck. Add 1 card with [Aqua]
//   or [Sea Animal] in any of its traits or 1 card with the [DS] trait among them to
//   the hand. Return the rest to the bottom of the deck. Then, trash the bottom
//   digivolution card of 1 of your opponent's Digimon.
// [Rule] Trait: Has [Aquatic] Type — mirrored via the same grantNameTrait("trait", …)
//   pattern the interpreter uses for every other "[Rule] Trait: Has [X] Type" card
//   (e.g. EX11-053, BT18-020's compiled IR). NOTE: unlike every sibling [Aquatic]-trait
//   card in cards.json (BT18-020, BT19-018/019/021/024/027/028, EX6-013/015, EX8-026/029,
//   P-164 — all of which carry "Aquatic" in CardDefinition.types), BT26-018's own types
//   are only ["Mollusk", "DS"] — the data is missing "Aquatic". packages/shared/** is
//   off-limits to edit in this port, so this is flagged as a known data gap, not fixed
//   here; the grant below still declares the rule correctly for anything that reads it
//   through the continuous name/trait-grant layer instead of raw CardDefinition.types.
// ＜Jamming＞ (inherited, printed) — parsed automatically from inheritedEffectText by the
//   engine's combat/keywords.ts (PRINTED_MATCHERS); needs no explicit grant.

const cardId = "BT26-018";

function matchesRevealFilter(def: CardDefinition): boolean {
  const types = def.types ?? [];
  return types.includes("Aqua") || types.includes("Sea Animal") || types.includes("DS");
}

/** Whether this card is the permanent that just moved from breeding to battle. */
function isSelfMove(ctx: EffectContext, source: CardSource): boolean {
  const movedId = ctx.trigger?.movedPermanentId;
  if (movedId === undefined) return false;
  return movedId === source.permanent()?.permanentId;
}

/**
 * Reveal the top 3 cards of the owner's deck, add 1 [Aqua]/[Sea Animal]/[DS] card among
 * them to hand, return the rest to the bottom of the deck, then trash the bottom
 * digivolution card of 1 of the opponent's Digimon.
 */
async function resolveRevealAndTrashBottom(ctx: EffectContext, source: CardSource): Promise<void> {
  const owner = ctx.game.player(source.ownerSeat);
  if (owner.deck.length > 0) {
    const revealed = await ctx.fx.reveal(source.ownerSeat, 3);
    const candidates = revealed.filter((c) => matchesRevealFilter(ctx.game.definitionOf(c))).map((c) => c.instanceId);

    let selected: string[] = [];
    if (candidates.length > 0) {
      selected = await ctx.ask.selectCards(ctx, { candidates, min: 0, max: 1 });
      if (selected.length > 0) await ctx.fx.returnToHand(selected);
    }

    const rest = revealed.filter((c) => !selected.includes(c.instanceId)).map((c) => c.instanceId);
    if (rest.length > 0) await ctx.fx.returnToDeck(rest, { toTop: false });
  }

  // Then, trash the bottom digivolution card of 1 of your opponent's Digimon.
  const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
  const targets = opponent.battleArea.filter(
    (p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)) && p.stack.length > 0,
  );
  if (targets.length === 0) return;

  let chosenId: string;
  if (targets.length === 1) {
    chosenId = targets[0]!.permanentId;
  } else {
    const chosen = await ctx.ask.chooseTargets(ctx, {
      candidates: targets.map((p) => p.permanentId),
      min: 1,
      max: 1,
    });
    if (chosen.length === 0) return;
    chosenId = chosen[0]!;
  }

  const permanent = ctx.game.permanentById(chosenId);
  if (permanent === undefined || permanent.stack.length === 0) return;
  const bottomCard = permanent.stack[0]!;
  await ctx.fx.trashDigivolutionCards(chosenId, [bottomCard.instanceId], {
    byEffectSeat: source.ownerSeat,
  });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [On Play] Reveal top 3, add 1 matching card to hand, rest to bottom, then trash
    // the bottom digivolution card of 1 opponent Digimon.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-reveal-trash`,
          description:
            "[On Play] Reveal the top 3 cards of your deck. Add 1 card with [Aqua] or " +
            "[Sea Animal] in any of its traits or 1 card with the [DS] trait among them " +
            "to the hand. Return the rest to the bottom of the deck. Then, trash the " +
            "bottom digivolution card of 1 of your opponent's Digimon.",
          optional: false,
          resolve: async (ctx) => resolveRevealAndTrashBottom(ctx, source),
        }),
      ];
    }

    // [When Moving] Same clause, fired when this Digimon itself moves from the
    // breeding area to the battle area (engine's OnMove window).
    if (timing === EffectTiming.OnMove) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/when-moving-reveal-trash`,
          description:
            "[When Moving] Reveal the top 3 cards of your deck. Add 1 card with [Aqua] or " +
            "[Sea Animal] in any of its traits or 1 card with the [DS] trait among them " +
            "to the hand. Return the rest to the bottom of the deck. Then, trash the " +
            "bottom digivolution card of 1 of your opponent's Digimon.",
          optional: false,
          when: (ctx) => isSelfMove(ctx, source),
          resolve: async (ctx) => resolveRevealAndTrashBottom(ctx, source),
        }),
      ];
    }

    // [Rule] Trait: Has [Aquatic] Type.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/rule-aquatic-trait`,
          description: "[Rule] Trait: Has [Aquatic] Type.",
          when: (_ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self !== undefined) {
              ctx.fx.grantNameTrait(self.permanentId, "trait", ["Aquatic"], EffectDuration.Permanent);
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
