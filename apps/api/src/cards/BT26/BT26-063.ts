// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const linkedSelf = { isSelfRef: true };
const opponentDigimon = { controllerDefault: "opponent", kind: ["Digimon"] };

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenLinked", sourceFilter: linkedSelf, actions: [{
        kind: "RevealAdd",
        revealCount: 3,
        add: [{ filter: { controllerDefault: "mine", nameOrTrait: [
          { tokens: ["Entertainment"], match: "trait" },
          { tokens: ["Open"], match: "trait" },
          { tokens: ["Seven Code"], match: "trait" },
        ] }, count: 1 }],
        rest: "deckTopOrBottom",
      }] }],
    },
    {
      trigger: "Static",
      isLinked: true,
      actions: [{ kind: "SubTrigger", event: "whenLinked", sourceFilter: linkedSelf, actions: [{
        kind: "Delete",
        target: { filter: opponentDigimon, count: 1, superlative: "lowestLevel" },
      }] }],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT26-063", compiled);
