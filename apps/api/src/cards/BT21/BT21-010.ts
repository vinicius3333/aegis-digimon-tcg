import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q5210: the condition is "2 or fewer security cards OR 3 or more [Hero] trait Tamers
// with different names". Encoded as orConditions on the action.
export const compiled: CompiledCard = {
  effects: [
    {
      // The continuous permission also participates in normal and effect-driven evolution
      // through the shared base-granted matcher; the activated view remains selectable.
      trigger: "YourTurn",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          into: {
            controllerDefault: "mine",
            nameOrTrait: [
              {
                tokens: ["Siriusmon"],
                match: "nameExact",
              },
            ],
          },
          payCost: true,
          from: ["hand"],
          costOverride: 4,
          ignoreRequirements: true,
          optional: true,
          condition: {
            kind: "orConditions",
            conditions: [
              {
                kind: "zoneCount",
                seat: "mine",
                zone: "security",
                op: "lte",
                value: 2,
              },
              {
                kind: "permanentCount",
                seat: "mine",
                filter: {
                  kind: ["Tamer"],
                  nameOrTrait: [
                    {
                      tokens: ["Hero"],
                      match: "trait",
                    },
                  ],
                  distinctNames: true,
                },
                op: "gte",
                value: 3,
              },
            ],
            raw: "you have 2 or fewer security cards or 3 or more [Hero] trait Tamers with different names",
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          amount: 2000,
          duration: "permanent",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      namesExact: ["Gurimon"],
      cost: 0,
      isAlternate: true,
    },
    {
      level: 2,
      traits: ["Hero"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT21-010", compiled);
