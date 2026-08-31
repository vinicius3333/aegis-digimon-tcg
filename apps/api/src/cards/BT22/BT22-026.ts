// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored override for BT22-026 (MetalGarurumon).
// [Hand][Main]: if you have [Nokia Shiramine], 1 of your [Gabumon] (in battle area)
// digivolves into this card for cost 6, ignoring requirements.
// [When Digivolving] modal: option A = 1 [Agumon] in battle area digivolves into
// [WarGreymon] from hand without cost, ignoring requirements.
// option B = return opponent's lowest-level Digimon to hand.
// [Inherited][When Attacking]: if this Digimon has [Omnimon] in name, unsuspend once/turn.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              controller: "mine",
              zone: "battleArea",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Gabumon"], match: "name" }],
            },
            count: 1,
          },
          into: {
            isSelfRef: true,
          },
          costOverride: 6,
          payCost: true,
          ignoreRequirements: true,
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              nameOrTrait: [{ tokens: ["Nokia Shiramine"], match: "name" }],
            },
            raw: "you have [Nokia Shiramine]",
          },
        },
      ],
      isFromHand: true,
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Modal",
          choose: 1,
          options: [
            [
              {
                // 1 [Agumon] in battle area digivolves into [WarGreymon] from hand
                // without paying the cost, ignoring requirements.
                kind: "Digivolve",
                target: {
                  filter: {
                    controller: "mine",
                    zone: "battleArea",
                    kind: ["Digimon"],
                    nameOrTrait: [{ tokens: ["Agumon"], match: "name" }],
                  },
                  count: 1,
                },
                into: {
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["WarGreymon"], match: "name" }],
                },
                from: ["hand"],
                payCost: false,
                ignoreRequirements: true,
                optional: true,
              },
            ],
            [
              {
                kind: "Return",
                target: {
                  filter: {
                    controller: "opponent",
                    kind: ["Digimon"],
                    superlative: "lowestLevel",
                  },
                  count: 1,
                },
                to: "hand",
              },
            ],
          ],
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Unsuspend",
          target: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
          condition: {
            kind: "selfHasNameContaining",
            names: ["Omnimon"],
            raw: "this Digimon has [Omnimon] in its name",
          },
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      names: ["Garurumon"],
      cost: 3,
      isAlternate: true,
    },
    {
      traits: ["CS"],
      cost: 3,
      isAlternate: true,
      level: 5,
    },
  ],
};

registerIrCard("BT22-026", compiled);
