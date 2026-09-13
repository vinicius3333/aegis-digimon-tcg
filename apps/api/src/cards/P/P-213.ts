import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const decodeEffect = (isInherited: boolean) => ({
  trigger: "AllTurns" as const,
  actions: [
    {
      kind: "Replacement" as const,
      event: "wouldLeavePlay" as const,
      mode: "instead" as const,
      sourceFilter: {
        isSelfRef: true,
      },
      leaveCause: "otherThanBattle" as const,
      raw: "＜Decode ([Aegiomon])＞: when this Digimon would leave other than in battle, you may play 1 [Aegiomon] from its digivolution cards without paying the cost.",
      actions: [
        {
          kind: "PlayWithoutCost" as const,
          target: {
            filter: {
              controller: "mine" as const,
              zone: "digivolutionCards" as const,
              kind: ["Digimon" as const],
              nameOrTrait: [
                {
                  tokens: ["Aegiomon"],
                  match: "nameExact" as const,
                },
              ],
            },
            count: 1,
          },
          fromOwnDigivolutionStack: true,
          payCost: false,
          playedByDecode: true,
          optional: true,
        },
      ],
    },
  ],
  ...(isInherited ? { isInherited: true as const } : {}),
});

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
          keyword: "Raid",
          raw: "＜Raid＞",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Decode",
          raw: "＜Decode ([Aegiomon])＞",
        },
      ],
    },
    decodeEffect(false),
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "Rush",
            raw: "＜Rush＞",
          },
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "zoneCount",
            seat: "mine",
            zone: "security",
            op: "lte",
            value: 3,
            raw: "you have 3 or fewer security cards",
          },
        },
        {
          kind: "ModifyDP",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          amount: 3000,
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "zoneCount",
            seat: "mine",
            zone: "security",
            op: "lte",
            value: 3,
            raw: "you have 3 or fewer security cards",
          },
        },
        {
          kind: "Attack",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          withoutSuspending: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [
        {
          keyword: "Decode",
          raw: "＜Decode ([Aegiomon])＞",
        },
      ],
    },
    decodeEffect(true),
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Aegiomon"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("P-213", compiled);
