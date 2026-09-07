import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [All Turns] When this Digimon would leave the battle area, you may place up to 4
// [Xros Heart]/[Blue Flare] trait Digimon cards from its digivolution cards under 1
// of your Tamers. No Blue color restriction in the text — trait only.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          grant: "name",
          digiXrosOnly: true,
          tokens: ["Shoutmon", "ZeigGreymon"],
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "SecurityAttack",
          amount: 1,
          raw: "＜Security Attack +1＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              superlative: "lowestDP",
            },
            count: 1,
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              superlative: "lowestDP",
            },
            count: 1,
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
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "PlaceUnder",
              target: {
                filter: {
                  kind: ["Digimon"],
                  nameOrTrait: [
                    {
                      tokens: ["Xros Heart", "Blue Flare"],
                      match: "trait",
                    },
                  ],
                  hostFilter: { isSelfRef: true },
                },
                count: 4,
                upTo: true,
                from: ["digivolutionCards"],
              },
              underFilter: {
                controller: "mine",
                kind: ["Tamer"],
                excludeToken: true,
              },
            },
          ],
          optional: true,
          raw: "you may place up to 4 [Xros Heart]/[Blue Flare] trait Digimon cards from its digivolution cards under 1 of your Tamers",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      namesExact: ["ZeigGreymon"],
      cost: 2,
      isAlternate: true,
    },
    {
      level: 5,
      traits: ["Xros Heart"],
      cost: 3,
      isAlternate: true,
    },
  ],
  digiXrosRequirement: [
    {
      materials: [{ names: ["OmniShoutmon"] }, { names: ["ZeigGreymon"] }],
      count: 3,
    },
  ],
};

registerIrCard("BT21-027", compiled);
