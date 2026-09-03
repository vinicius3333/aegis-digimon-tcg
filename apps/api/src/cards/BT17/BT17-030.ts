import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          cost: {
            kind: "place",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Leon Alexander"],
                    match: "name",
                  },
                ],
              },
              count: 1,
              from: ["hand"],
            },
            raw: "By placing 1 [Leon Alexander] from your hand as this Digimon's bottom digivolution card",
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
          },
          optional: true,
          abortOnDecline: true,
          condition: {
            kind: "securityAtLeast",
            value: 3,
            raw: "you have 3 or more security cards",
          },
        },
      ],
    },
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "addTop",
          controller: "mine",
          source: "deck",
          amount: 1,
          cost: {
            kind: "place",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
                nameOrTrait: [{ tokens: ["Leon Alexander"], match: "name" }],
              },
              count: 1,
              from: ["hand"],
            },
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
          },
          optional: true,
          abortOnDecline: true,
          condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 2 },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Aura",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          effect: {
            kind: "modifyDP",
            amount: 1000,
          },
          while: {
            kind: "selfTopHasText",
            filter: { nameOrTrait: [{ tokens: ["Pulsemon"], match: "text" }] },
            raw: "this Digimon has [Pulsemon] in its text",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Bibimon"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT17-030", compiled);
