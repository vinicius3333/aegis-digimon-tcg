// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-corrected IR for BT9-012 (Greymon X Antibody).
// Inherited effect: when this Digimon has [Greymon] or [Omnimon] in its name
// and an effect would delete it or return it to hand/deck, you may trash 2
// same-level digivolution cards to prevent it from leaving play.
// KB Q1803-Q1805: the two cards share a level with each other, the source
// itself may be paid, and only effect-driven deletion/hand/deck return qualify.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          leaveCause: "byEffect",
          optional: true,
          sourceFilter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Greymon", "Omnimon"], match: "name" }],
          },
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "digivolutionCards",
                isSelfRef: true,
                sameLevelPair: true,
              },
              count: 2,
              from: ["digivolutionCards"],
            },
            preventCheck: async (subCtx) => {
              const current = subCtx.source.permanent();
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
              if (levels[0] === undefined || levels[1] === undefined || levels[0] !== levels[1]) {
                return false;
              }

              await subCtx.fx.trash(chosen);
              return true;
            },
          });
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ names: ["Greymon"], cost: 0, isAlternate: true }],
};

registerIrCard("BT9-012", compiled);
