// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [{
        kind: "Replacement",
        event: "wouldDigivolve",
        sourceFilter: { isSelfRef: true },
        into: {
          controllerDefault: "mine",
          nameOrTrait: [{ tokens: ["Greymon"], match: "name" }],
        },
        actions: [{ kind: "Replacement", event: "wouldDigivolve", mode: "reduceCost", amount: 1 }],
        scaling: { per: 1, filter: { controllerDefault: "mine" }, unit: "colors" },
      }],
    },
    {
      trigger: "AllTurns",
      actions: [{
        kind: "Replacement",
        event: "wouldBeDeleted",
        sourceFilter: {
          controllerDefault: "mine",
          kind: ["Digimon"],
          nameOrTrait: [{ tokens: ["Greymon", "Omnimon"], match: "name" }],
        },
        actions: [{
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: { cannotLeavePlay: true },
          duration: "forTheTurn",
          cost: {
            kind: "place",
            target: {
              filter: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["X Antibody"], match: "name" }],
              },
              count: 1,
              from: ["deck", "digivolutionCards"],
            },
          },
          optional: true,
          abortOnDecline: true,
        }],
      }],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT11-064", compiled);
