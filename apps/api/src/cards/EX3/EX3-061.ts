import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [{ tokens: ["Paildramon"], match: "nameExact" }],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          optional: true,
          condition: {
            kind: "isDnaDigivolving",
            raw: "When DNA digivolving",
          },
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [{ tokens: ["Wormmon"], match: "nameExact" }],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "GrantCanAttackUnsuspended",
          target: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
          duration: "permanent",
          condition: {
            kind: "selfHasNameContaining",
            names: ["Imperialdramon"],
            raw: "this Digimon has [Imperialdramon] in its name",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  dnaDigivolveRequirement: [
    {
      cost: 0,
      materials: [
        { color: "Purple", level: 4 },
        { color: "Red", level: 4 },
      ],
    },
  ],
};

registerIrCard("EX3-061", compiled);
