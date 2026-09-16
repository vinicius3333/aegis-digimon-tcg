import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] },
    { trigger: "Static", isInherited: true, actions: [], keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] },
    {
      trigger: "WhenDigivolving",
      isBreeding: true,
      actions: [
        {
          kind: "MovePermanent",
          direction: "toBattle",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          optional: true,
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "Digivolve",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Lucemon: Chaos Mode"], match: "nameExact" }],
          },
          from: ["trash"],
          payCost: false,
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "return",
            target: { filter: { controller: "mine", zone: "trash", textContains: "Lucemon" }, count: 5 },
            to: "deckBottom",
            optional: true,
            raw: "By returning 5 cards with [Lucemon] in their texts from your trash to the bottom of the deck",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ names: ["Cupimon"], cost: 5, level: 2, isAlternate: true }],
};

registerIrCard("EX10-013", compiled);
export default compiled;
