import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Guard", raw: "＜Guard＞" }],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart: "[On Play] [When Digivolving] ＜De-Digivolve 1＞ 1 of your opponent's Digimon.",
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 1,
        },
        {
          effectTextPart: "Then, 1 of your other [SW] trait Digimon may gain ＜Alliance＞ for the turn and attack.",
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
          abortOnDecline: true,
        },
        {
          effectTextPart: "Then, 1 of your other [SW] trait Digimon may gain ＜Alliance＞ for the turn and attack.",
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
          attackPlayer: true,
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
          effectTextPart: "[On Play] [When Digivolving] ＜De-Digivolve 1＞ 1 of your opponent's Digimon.",
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 1,
        },
        {
          effectTextPart: "Then, 1 of your other [SW] trait Digimon may gain ＜Alliance＞ for the turn and attack.",
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
          abortOnDecline: true,
        },
        {
          effectTextPart: "Then, 1 of your other [SW] trait Digimon may gain ＜Alliance＞ for the turn and attack.",
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
          attackPlayer: true,
          condition: {
            kind: "ifThisEffectActed",
            raw: "if a Digimon gained Alliance",
          },
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [
            {
              kind: "RedirectAttack",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
              optional: true,
            },
          ],
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
          nameOrTrait: [
            { tokens: ["Gokuumon"], match: "text" },
            { tokens: ["SW"], match: "trait" },
          ],
          levelMax: 5,
        },
      ],
      count: 2,
      maxMaterials: 1,
    },
  ],
};

registerIrCard("EX12-056", compiled);
