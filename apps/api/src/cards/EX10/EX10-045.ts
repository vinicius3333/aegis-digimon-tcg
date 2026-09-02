import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX10-045 Tuwarmon
// Fixes:
//   - DigiXros: was [Damemon] count:2 (wrong); text is [DigiXros -2] [Damemon] x [ChuuChuumon]
//     = two distinct material slots with cost reduction 2 each.
//   - "[Digivolve] [Damemon]: Cost 1" is the digivolutionRequirement, not a Main effect.
//   - GainKeyword(Retaliation) was optional+abortOnDecline — wrong. The effect is a single
//     "by trashing, gain Blocker AND Retaliation". Second GainKeyword is mandatory after cost.
//   - the Retaliation target is the canonical typed `fromSelectionRef` shape. `filter`/`count`
//     are IGNORED for that form (Target docs; targeting/permanents.ts short-circuits on the
//     bound id), so they carry no semantics — they exist only to satisfy `Target`.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Rush",
          raw: "＜Rush＞",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Collision",
          raw: "＜Collision＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Bagra Army"],
                  match: "trait",
                },
              ],
            },
            count: 1,
            bindAs: "chosen",
          },
          keyword: {
            keyword: "Blocker",
            raw: "＜Blocker＞",
          },
          duration: "untilOpponentTurnEnd",
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                hostFilter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Bagra Army"], match: "trait" }],
                },
              },
              count: 1,
              from: ["digivolutionCards"],
            },
            raw: "By trashing any 1 digivolution card of your [Bagra Army] trait Digimon",
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "GainKeyword",
          target: { filter: {}, count: 1, fromSelectionRef: "chosen" },
          keyword: {
            keyword: "Retaliation",
            raw: "＜Retaliation＞",
          },
          duration: "untilOpponentTurnEnd",
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Bagra Army"],
                  match: "trait",
                },
              ],
            },
            count: 1,
            bindAs: "chosen",
          },
          keyword: {
            keyword: "Blocker",
            raw: "＜Blocker＞",
          },
          duration: "untilOpponentTurnEnd",
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                hostFilter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Bagra Army"], match: "trait" }],
                },
              },
              count: 1,
              from: ["digivolutionCards"],
            },
            raw: "By trashing any 1 digivolution card of your [Bagra Army] trait Digimon",
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "GainKeyword",
          target: { filter: {}, count: 1, fromSelectionRef: "chosen" },
          keyword: {
            keyword: "Retaliation",
            raw: "＜Retaliation＞",
          },
          duration: "untilOpponentTurnEnd",
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Bagra Army"],
                  match: "trait",
                },
              ],
            },
            count: 1,
            bindAs: "chosen",
          },
          keyword: {
            keyword: "Blocker",
            raw: "＜Blocker＞",
          },
          duration: "untilOpponentTurnEnd",
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                hostFilter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Bagra Army"], match: "trait" }],
                },
              },
              count: 1,
              from: ["digivolutionCards"],
            },
            raw: "By trashing any 1 digivolution card of your [Bagra Army] trait Digimon",
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "GainKeyword",
          target: { filter: {}, count: 1, fromSelectionRef: "chosen" },
          keyword: {
            keyword: "Retaliation",
            raw: "＜Retaliation＞",
          },
          duration: "untilOpponentTurnEnd",
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlaceUnder",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          underFilter: { controller: "mine", kind: ["Tamer"], excludeToken: true },
          optional: true,
        },
      ],
      keywords: [
        {
          keyword: "Save",
          raw: "＜Save＞",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDigivolutionCardsDiscardedBatch",
          sourceFilter: { isSelfRef: true },
          hostFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Bagra Army"], match: "trait" }],
          },
          actions: [
            {
              kind: "Draw",
              controller: "mine",
              amount: 1,
            },
          ],
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Damemon"],
      cost: 1,
      isAlternate: true,
    },
  ],
  digiXrosRequirement: [
    {
      materials: [
        {
          names: ["Damemon"],
        },
        {
          names: ["ChuuChuumon"],
        },
      ],
      count: 2,
    },
  ],
};

registerIrCard("EX10-045", compiled);

export { compiled };
