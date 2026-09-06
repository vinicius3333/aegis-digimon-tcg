import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q4717: the attack after "then" can be processed even if condition is not met.
// So condition only gates the GrantStatic (immuneToOpponentEffects), not the Attack.
// [Your Turn] grants <Piercing> AND can also attack unsuspended Digimon to [Sistermon]/[Royal Knight].
// Inherited [Your Turn] while this Digimon is [Jesmon GX]: all Digimon gain <Piercing> + attack unsuspended.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Alliance",
          raw: "＜Alliance＞",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
            upTo: false,
          },
          grant: "immuneToOpponentEffects",
          duration: "forTheTurn",
          condition: {
            kind: "selfDigivolutionStackMatchesFilter",
            filter: {
              nameOrTrait: [
                {
                  tokens: ["Jesmon"],
                  match: "nameExact",
                },
                {
                  tokens: ["X Antibody"],
                  match: "nameExact",
                },
              ],
            },
            raw: "[Jesmon]/[X Antibody] is in this Digimon's digivolution cards",
          },
        },
        {
          kind: "Attack",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          withoutSuspending: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Sistermon"],
                  match: "name",
                },
                {
                  tokens: ["Royal Knight"],
                  match: "trait",
                },
              ],
            },
            count: "all",
          },
          keyword: {
            keyword: "Piercing",
            raw: "＜Piercing＞",
          },
          duration: "permanent",
        },
        {
          kind: "GrantCanAttackUnsuspended",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Sistermon"],
                  match: "name",
                },
                {
                  tokens: ["Royal Knight"],
                  match: "trait",
                },
              ],
            },
            count: "all",
          },
          duration: "permanent",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: "all",
          },
          keyword: {
            keyword: "Piercing",
            raw: "＜Piercing＞",
          },
          duration: "permanent",
          condition: {
            kind: "selfHasName",
            names: ["Jesmon GX"],
            raw: "this Digimon is [Jesmon GX]",
          },
        },
        {
          kind: "GrantCanAttackUnsuspended",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: "all",
          },
          duration: "permanent",
          condition: {
            kind: "selfHasName",
            names: ["Jesmon GX"],
            raw: "this Digimon is [Jesmon GX]",
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
      names: ["Jesmon"],
      cost: 1,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT20-019", compiled);
