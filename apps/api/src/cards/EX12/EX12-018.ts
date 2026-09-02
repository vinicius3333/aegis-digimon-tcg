import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX12-018 Siriusmon / Planet Punch (DUAL Digimon + Option).
//
// "give -2000 DP ... for each of this Digimon's digivolution cards" counts EVERY card in the
// source's stack. The generated shape carried `filter: { controllerDefault: "mine", kind:
// ["Digimon"] }`, which `definitionMatches` applies per stack card, so a Digi-Egg (catalog kind
// "DigiEgg", not "Digimon") was skipped — every Siriusmon raised through the breeding area was
// short by 2000 DP. The scaling unit "digivolutionCards" already scopes the count to the source's
// own stack, so the filter must be empty.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Progress",
          raw: "＜Progress＞",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Piercing",
          raw: "＜Piercing＞",
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
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Gammamon"],
                  match: "text",
                },
                {
                  tokens: ["VB"],
                  match: "trait",
                },
              ],
            },
            count: 2,
            upTo: true,
            from: ["hand", "trash"],
          },
          position: "choice",
          optional: true,
        },
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: -2000,
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "ifThisEffectActed",
            raw: "this effect placed",
          },
          scaling: {
            per: 1,
            filter: {},
            unit: "digivolutionCards",
          },
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Gammamon"],
                  match: "text",
                },
                {
                  tokens: ["VB"],
                  match: "trait",
                },
              ],
            },
            count: 2,
            upTo: true,
            from: ["hand", "trash"],
          },
          position: "choice",
          optional: true,
        },
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: -2000,
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "ifThisEffectActed",
            raw: "this effect placed",
          },
          scaling: {
            per: 1,
            filter: {},
            unit: "digivolutionCards",
          },
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              nameOrTrait: [
                {
                  tokens: ["VB"],
                  match: "trait",
                },
              ],
            },
            raw: "you have a card w/[VB] trait",
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              superlative: "highestDP",
            },
            count: 1,
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
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      texts: ["Gammamon"],
      cost: 3,
      isAlternate: true,
    },
    {
      traits: ["VB"],
      cost: 3,
      isAlternate: true,
      level: 5,
    },
  ],
};

registerIrCard("EX12-018", compiled);
