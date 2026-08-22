// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const reveal: any = {
  kind: "RevealAdd",
  revealCount: 3,
  add: [
    {
      filter: {
        controllerDefault: "mine",
        nameOrTrait: [{ tokens: ["Greymon", "X Antibody"], match: "name" }],
      },
      count: 1,
      to: "hand",
    },
    {
      filter: { controllerDefault: "mine", kind: ["Tamer"], colors: ["Black"] },
      count: 1,
      to: "hand",
    },
  ],
  rest: "deckBottom",
};

const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: [reveal] },
    { trigger: "WhenDigivolving", actions: [reveal] },
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

registerIrCard("BT11-062", compiled);
