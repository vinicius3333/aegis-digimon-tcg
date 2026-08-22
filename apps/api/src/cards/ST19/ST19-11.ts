// @ts-nocheck
// Hand-fixed: conditional -3000 targets opponent Digimon (total -6000, per KB Q858);
// condition counts both players' Digimon (KB Q857); inherited cost allows Token OR Puppet Digimon.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: -3000,
          duration: "forTheTurn",
        },
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
            sameAsPrev: true,
          },
          amount: -3000,
          duration: "forTheTurn",
          condition: {
            kind: "totalDigimonGte",
            count: 3,
            raw: "there are 3 or more total Digimon between both players",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: -3000,
          duration: "forTheTurn",
        },
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
            sameAsPrev: true,
          },
          amount: -3000,
          duration: "forTheTurn",
          condition: {
            kind: "totalDigimonGte",
            count: 3,
            raw: "there are 3 or more total Digimon between both players",
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "otherThanYourEffect",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [],
          cost: {
            kind: "deleteOwn",
            target: {
              filter: {
                controller: "mine",
                excludeSelf: true,
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Puppet"], match: "trait" }],
              },
              orFilters: [
                {
                  controller: "mine",
                  excludeSelf: true,
                  includeToken: true,
                },
              ],
              count: 1,
            },
            raw: "by deleting 1 of your Tokens or 1 of your other Digimon with the [Puppet] trait, prevent it from leaving",
          },
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("ST19-11", compiled);
