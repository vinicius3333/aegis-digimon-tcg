// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: { isSelfRef: true },
          into: {
            controllerDefault: "mine",
            nameOrTrait: [{ tokens: ["Greymon"], match: "name" }],
          },
          actions: [{ kind: "Replacement", event: "wouldDigivolve", mode: "reduceCost", amount: 1 }],
          scaling: { per: 1, filter: { controllerDefault: "mine" }, unit: "colors" },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          sourceFilter: { isSelfRef: true },
          leaveCause: "byEffect",
          condition: {
            kind: "selfHasNameContaining",
            names: ["Greymon", "Omnimon"],
            raw: "this Digimon has [Greymon] or [Omnimon] in its name",
          },
          cost: {
            kind: "return",
            target: {
              filter: {
                zone: "digivolutionCards",
                controller: "mine",
                kind: ["Option"],
                nameOrTrait: [{ tokens: ["X Antibody"], match: "name" }],
                hostFilter: { isSelfRef: true },
              },
              count: 1,
            },
            to: "deckBottom",
            raw: "place 1 [X Antibody] from this Digimon's digivolution cards at the bottom of its owner's deck",
          },
          optional: true,
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ names: ["Greymon"], cost: 0, isAlternate: true }],
};

registerIrCard("BT11-064", compiled);
