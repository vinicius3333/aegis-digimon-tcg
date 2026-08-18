import { EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// Greymon (X Antibody) — BT9-012 (Red Lv.4 Digimon).
//
// This module hand-authors ONLY the INHERITED leave-prevention effect (the lower-box
// effect that applies to whatever Digimon carries BT9-012 in its digivolution cards).
// The primary "Digivolve: 0 from [Greymon]" requirement is a structural
// `digivolutionRequirement` already exposed by the IR/effects.json — it is NOT an
// effect and is intentionally not re-handled here.
//
// Printed inherited text:
//   "[All Turns] When this Digimon has [Greymon] or [Omnimon] in its name and an
//    effect would delete it or return it to your hand or deck, you may trash 2 cards
//    of the same level in this Digimon's digivolution cards to prevent it from
//    leaving play."
//
// KB (node tools/kb/query.mjs card BT9-012):
//   Q1803: "2 cards of the same level" = two cards in the host's digivolution cards
//          that are the same level AS EACH OTHER (NOT the same level as this card).
//   Q1804: a card may include ITSELF — any of the host's digivolution cards count,
//          no exclusion (so BT9-012 in the stack is a valid trash candidate).
//   Q1805: it ONLY activates when the protected Digimon is deleted/returned BY AN
//          EFFECT. A DP-reduced-to-0 deletion is by GAME RULES, not an effect, so the
//          prevention does NOT fire. => the cause gate is `byEffect` ONLY.
//
// Mechanism (verified against the engine, not guessed):
//   - This is an INHERITED static effect on a digivolution-stack card. The continuous
//     recompute (GameEngine.recomputeContinuousEffects) iterates EVERY candidate
//     instance — including stack cards — for its EffectTiming.None effects and runs
//     them through canTrigger + canActivate. canActivate's placement guard
//     (kernel.passesPlacementGuard) requires an inherited effect's source to be a
//     digivolution-stack card (NOT the top) under a Digimon — exactly this case.
//   - For a stack card, `source.permanent()` resolves to the HOST permanent
//     (createCardStateLookup.permanentOf scans top + stack + linked), so the
//     replacement is installed with the HOST's permanentId and protects the host.
//   - Re-installed each recompute pass: subscribeReplacement is stamped `continuous`
//     during the recompute, so clearContinuous drops and re-derives it without
//     accumulation.
//
// Destination scope (delete + hand/deck bounce only):
//   The engine routes effect-deletions (deletePermanent) and effect hand/deck bounces
//   (returnToHand / returnToDeck via filterBouncePrevented) through the leave-prevention
//   consult, but does NOT route a move to security, breeding, or under another card
//   through it. So the printed restriction to "delete it or return it to your hand or
//   deck" is satisfied automatically by the seams that consult the prevention — there
//   is no over-firing path to exclude.
const cardId = "BT9-012";

const PROTECTED_NAME_TOKENS = ["Greymon", "Omnimon"];

function nameQualifies(name: string): boolean {
  return PROTECTED_NAME_TOKENS.some((token) => name.includes(token));
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.None) return [];

    return [
      staticModifier({
        source,
        effectKey: `${cardId}/prevent-leave-same-level`,
        description:
          "[All Turns] When this Digimon has [Greymon] or [Omnimon] in its name and an " +
          "effect would delete it or return it to your hand or deck, you may trash 2 cards " +
          "of the same level in this Digimon's digivolution cards to prevent it from leaving play.",
        // Inherited: applies through the digivolution stack to the host permanent.
        isInherited: true,
        // The host must be a battle-area Digimon for the effect to be relevant; the
        // placement guard already requires a Digimon host, but the on-field base guard
        // (source.isOnBattleArea, true for a stack card under a battle-area host) keeps
        // it from arming while the host sits in breeding.
        when: (ctx) => ctx.source.isOnBattleArea(),
        resolve: async (ctx) => {
          const host = ctx.source.permanent();
          if (host === undefined) return;
          const hostId = host.permanentId;

          ctx.fx.subscribeReplacement({
            event: "wouldLeavePlay",
            sourcePermanentId: hostId,
            mode: "prevent",
            description:
              "[All Turns] You may trash 2 same-level digivolution cards to prevent this " +
              "Digimon (with [Greymon]/[Omnimon] in its name) from being deleted or returned to hand/deck.",
            // Q1805: only an EFFECT-driven removal qualifies — a byRule (DP-0) or
            // byBattle removal must NOT fire this prevention.
            causeAllows: (cause) => cause === "byEffect",
            protects: (subCtx, leavingId) => {
              if (leavingId !== hostId) return false;
              const leaving = subCtx.game.permanentById(leavingId);
              if (leaving === undefined || leaving.topCard === undefined) return false;
              const def = subCtx.game.definitionOf(leaving.topCard);
              // "When this Digimon has [Greymon] or [Omnimon] in its name" — read the
              // host's CURRENT top-card name at consult time.
              return nameQualifies(def.nameEn);
            },
            preventCheck: async (subCtx) => {
              const current = subCtx.game.permanentById(hostId);
              if (current === undefined) return false;

              // Cost candidates: this Digimon's digivolution cards (the host stack),
              // including BT9-012 itself (Q1804).
              const stack = current.stack;
              if (stack.length < 2) return false;

              // Q1803: the two trashed cards must share a level WITH EACH OTHER. Group
              // the stack by level and keep only levels with at least two cards; a
              // level-less card (Tamer/Option in the stack) cannot pair by level.
              const byLevel = new Map<number, string[]>();
              for (const card of stack) {
                const level = subCtx.game.definitionOf(card).level;
                if (level === undefined) continue;
                const group = byLevel.get(level) ?? [];
                group.push(card.instanceId);
                byLevel.set(level, group);
              }
              const payableInstanceIds: string[] = [];
              for (const group of byLevel.values()) {
                if (group.length >= 2) payableInstanceIds.push(...group);
              }
              // No two stack cards share a level => the cost cannot be paid => not prevented.
              if (payableInstanceIds.length < 2) return false;

              // "you may" — optional. Ask before charging the cost.
              const yes = await subCtx.ask.optional(
                subCtx,
                "Trash 2 same-level digivolution cards to prevent this Digimon from leaving play?",
              );
              if (!yes) return false;

              const chosen = await subCtx.ask.selectCards(subCtx, {
                candidates: payableInstanceIds,
                min: 2,
                max: 2,
              });
              if (chosen.length !== 2) return false;

              // Validate the selection actually shares a level (a client could return
              // any two of the offered candidates; the offered set spans multiple valid
              // level groups, so two picks from DIFFERENT groups must be rejected).
              const levels = chosen.map((id) => {
                const card = stack.find((c) => c.instanceId === id);
                return card === undefined ? undefined : subCtx.game.definitionOf(card).level;
              });
              if (
                levels[0] === undefined ||
                levels[1] === undefined ||
                levels[0] !== levels[1]
              ) {
                return false;
              }

              await subCtx.fx.trash(chosen);
              return true;
            },
          });
        },
      }),
    ];
  },
};

registerCard(module);
export default module;
