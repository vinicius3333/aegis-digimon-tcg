// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-corrected IR for BT9-012 (Greymon X Antibody).
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
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Greymon", "Omnimon"], match: "name" }],
            },
            count: 1,
          },
          cost: {
            kind: "trash",
            target: {
              filter: { zone: "digivolutionCards", isSelfRef: true, sameLevelPair: true },
              count: 2,
              from: ["digivolutionCards"],
            },
            preventCheck: async (subCtx) => {
              const host = subCtx.source.permanent();
              if (host === undefined || host.stack.length < 2) return false;
              const byLevel = new Map<number, string[]>();
              for (const card of host.stack) {
                const level = subCtx.game.definitionOf(card).level;
                if (level === undefined) continue;
                const group = byLevel.get(level) ?? [];
                group.push(card.instanceId);
                byLevel.set(level, group);
              }
              const candidates = [...byLevel.values()].flatMap((group) => (group.length >= 2 ? group : []));
              if (candidates.length < 2) return false;
              if (!(await subCtx.ask.optional(subCtx, "Trash 2 same-level digivolution cards to prevent this Digimon from leaving play?"))) return false;
              const chosen = await subCtx.ask.selectCards(subCtx, { candidates, min: 2, max: 2 });
              if (chosen.length !== 2) return false;
              const levels = chosen.map((id) => {
                const card = host.stack.find((entry) => entry.instanceId === id);
                return card === undefined ? undefined : subCtx.game.definitionOf(card).level;
              });
              if (levels[0] === undefined || levels[0] !== levels[1]) return false;
              await subCtx.fx.trash(chosen);
              return true;
            },
          },
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
