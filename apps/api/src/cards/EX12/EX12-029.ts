// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Blocker",
          raw: "＜Blocker＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 1,
          },
          restriction: "suspend",
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              excludeSelf: true,
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["SW"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          keyword: {
            keyword: "Alliance",
            raw: "＜Alliance＞",
          },
          duration: "forTheTurn",
          optional: true,
        },
        {
          kind: "Attack",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
            sameTarget: true,
          },
          mandatory: true,
          withoutSuspending: false,
          condition: {
            kind: "ifThisEffectActed",
            raw: "if a Digimon gained Alliance",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 1,
          },
          restriction: "suspend",
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              excludeSelf: true,
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["SW"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          keyword: {
            keyword: "Alliance",
            raw: "＜Alliance＞",
          },
          duration: "forTheTurn",
          optional: true,
        },
        {
          kind: "Attack",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
            sameTarget: true,
          },
          mandatory: true,
          withoutSuspending: false,
          condition: {
            kind: "ifThisEffectActed",
            raw: "if a Digimon gained Alliance",
          },
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "TrashDigivolution",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              digivolutionCards: "hasAny",
            },
            count: 1,
          },
          amount: 2,
          fromTop: false,
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              digivolutionCards: "hasNone",
            },
            count: 1,
          },
          restriction: "suspend",
          duration: "untilOpponentTurnEnd",
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
      level: 4,
      traits: ["Shambala"],
      cost: 3,
      isAlternate: true,
    },
  ],
  digiXrosRequirement: [
    {
      materials: [
        {
          levelMax: 5,
          nameOrTrait: [
            {
              tokens: ["Gokuumon"],
              match: "text",
            },
            {
              tokens: ["SW"],
              match: "trait",
            },
          ],
        },
      ],
      count: 2,
      maxMaterials: 1,
    },
  ],
};

registerIrCard("EX12-029", compiled);
