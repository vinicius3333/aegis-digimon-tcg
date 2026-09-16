import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Digivolve",
          condition: {
            kind: "securityAtMost",
            value: 1,
          },
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          into: {
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Omnimon (X Antibody)"],
                match: "nameExact",
              },
            ],
          },
          payCost: false,
          optional: true,
          ignoreRequirements: true,
          from: ["hand"],
        },
      ],
    },
    {
      trigger: "OnDeletion",
      optional: true,
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          underFilter: {
            nameOrTrait: [
              {
                tokens: ["King Drasil_7D6"],
                match: "nameExact",
              },
            ],
            controller: "mine",
            zone: "breeding",
          },
          position: "bottom",
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
      isInherited: true,
      isBreeding: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          raw: "when your security stack is removed from, by suspending this Digimon, play 1 [Omekamon] from this Digimon's digivolution cards without paying the cost",
          fireCondition: {
            kind: "triggerRemovedSecuritySeat",
            seat: "mine",
          },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  nameOrTrait: [
                    {
                      tokens: ["Omekamon"],
                      match: "nameExact",
                    },
                  ],
                },
                count: 1,
              },
              fromOwnDigivolutionStack: true,
              payCost: false,
              optional: true,
              cost: {
                kind: "suspend",
                target: {
                  filter: {
                    isSelfRef: true,
                  },
                  count: 1,
                  isSelf: true,
                },
              },
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT20-083", compiled);
