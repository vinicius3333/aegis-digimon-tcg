import { CardKind, EffectTiming } from "@aegis/shared";
import type { CardDefinition, Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, security, turnTiming } from "../../engine/effects/builders.js";
import { matchNameOrTrait } from "../../engine/effects/interpreter.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-096 — Kosuke Misono (BT26, Purple Tamer, TS).
//
// Provisional port: no KB entry (errata/Q&A) exists yet for BT26-096 as of this port
// (`node tools/kb/query.mjs card BT26-096` against the refreshed knowledge base returned no
// entries). Implemented from the printed card text only.
//
// [Start of Your Turn] If you have 2 or less memory, set it to 3.
// [Main] By returning this Tamer to the bottom of the deck, you may play 1 Digimon card with
//   [Chronomon] in its text or 1 Tamer card with the [TS] trait from your hand or trash with
//   the cost reduced by 2.
//
// Clause 1 is EX12-066/EX12-068/BT3-093's exact shape: `ctx.game.state.memory <= 2` gates the
//   activation and `setMemory(3)` performs it.
// Clause 2 is a `[Main]` activated ability. "with [Chronomon] in its text" uses
//   `matchNameOrTrait(def, { tokens: ["Chronomon"], match: "text" })` — the interpreter helper
//   BT26-001/BT26-065 already use for this exact phrase, matching the reading in the official
//   Q&A (BT26-060's Q7087: name, traits, effects, inherited effects, requirements, ...).
//   "from your hand or trash" is `playInstances`, which locates a loose instance in either zone
//   (`playFromHand` cannot reach the trash), with `payCost: true` + `costDelta: 2` for
//   "with the cost reduced by 2". The Tamer is returned FIRST, as printed — the play resolves
//   afterwards even though this Tamer has already left the battle area.
//   The window is `EffectTiming.OnDeclaration`, the `activateEffect` verb's timing for a
//   PERMANENT's activated [Main] ability (ST4-13/EX6-010/BT12-015) — not `OnUseOption`, which
//   is the Option-card play path (BT26-033's dual card uses that one because its [Main] is on
//   the Option side).

const cardId = "BT26-096";
const CHRONOMON_TOKEN = "Chronomon";
const TS_TRAIT = "TS";
const COST_REDUCTION = 2;
const LOW_MEMORY_THRESHOLD = 2;
const RESET_MEMORY_TO = 3;

const isDigimon = (def: CardDefinition): boolean => def.kinds?.includes(CardKind.Digimon) === true;
const isTamer = (def: CardDefinition): boolean => def.kinds?.includes(CardKind.Tamer) === true;

function isPlayable(def: CardDefinition): boolean {
  if (isDigimon(def)) return matchNameOrTrait(def, { tokens: [CHRONOMON_TOKEN], match: "text" });
  if (isTamer(def)) return (def.types ?? []).includes(TS_TRAIT);
  return false;
}

function playCandidates(ctx: EffectContext, ownerSeat: Seat): string[] {
  const owner = ctx.game.player(ownerSeat);
  return [...owner.hand, ...owner.trash]
    .filter((card) => isPlayable(ctx.game.definitionOf(card)))
    .map((card) => card.instanceId);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnStartTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-turn-set-memory`,
          description: "[Start of Your Turn] If you have 2 or less memory, set it to 3.",
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          canActivate: (ctx) => ctx.game.state.memory <= LOW_MEMORY_THRESHOLD,
          resolve: async (ctx) => {
            if (ctx.game.state.memory > LOW_MEMORY_THRESHOLD) return;
            ctx.fx.setMemory(RESET_MEMORY_TO);
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnDeclaration) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-return-self-play-discounted`,
          description:
            "[Main] By returning this Tamer to the bottom of the deck, you may play 1 Digimon " +
            "card with [Chronomon] in its text or 1 Tamer card with the [TS] trait from your " +
            "hand or trash with the cost reduced by 2.",
          optional: true,
          canActivate: (ctx) => ctx.source.permanent()?.topCard !== undefined,
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self?.topCard === undefined) return;

            await ctx.fx.returnToDeck([self.topCard.instanceId], { toTop: false });

            const candidates = playCandidates(ctx, source.ownerSeat);
            if (candidates.length === 0) return;

            const chosen = await ctx.ask.selectCards(ctx, { candidates, min: 0, max: 1 });
            if (chosen.length === 0) return;

            await ctx.fx.playInstances(chosen, {
              payCost: true,
              costDelta: COST_REDUCTION,
              effectSourceCardId: cardId,
            });
          },
        }),
      ];
    }

    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play-free`,
          description: "[Security] Play this card without paying the cost.",
          optional: false,
          resolve: async (ctx) => {
            await ctx.fx.playFromSecurity(source.instanceId, { payCost: false });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
