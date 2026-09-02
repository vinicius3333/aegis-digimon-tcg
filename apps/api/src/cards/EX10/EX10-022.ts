import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored override (runtime-effect fix).
//  - The "6 or fewer cards in hand" buff also grants +3000 DP for the turn (was dropped).
//  - The inherited [End of Opponent's Turn] "trash this Digimon's top stacked card" is a
//    TrashDigivolution of the source's own top digivolution card, NOT Trash isSelfRef
//    (which would trash the active top card / the Digimon itself). Gated on the host being
//    [Belphemon: Sleep Mode] via selfTopHasText.
//  - That gate matches on "name", not "text". "If this Digimon is [Belphemon: Sleep Mode]"
//    reads the HOST's name; a "text" match also scans printed effect and digivolution
//    requirement text, so a [Belphemon: Rage Mode] host (whose own [Digivolve] line names
//    [Belphemon: Sleep Mode]) would wrongly satisfy the gate. KB Q5073 keeps it mandatory.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Fortitude",
          raw: "＜Fortitude＞",
        },
      ],
    },
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 5,
              },
            },
            count: "all",
          },
        },
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
            keyword: "Piercing",
            raw: "＜Piercing＞",
          },
          duration: "forTheTurn",
          condition: {
            kind: "zoneCount",
            seat: "mine",
            zone: "hand",
            op: "lte",
            value: 6,
            raw: "you have 6 or fewer cards in your hand",
          },
        },
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
            keyword: "SecurityAttack",
            amount: 2,
            raw: "＜Security Attack +2＞",
          },
          duration: "forTheTurn",
          condition: {
            kind: "zoneCount",
            seat: "mine",
            zone: "hand",
            op: "lte",
            value: 6,
            raw: "you have 6 or fewer cards in your hand",
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
          duration: "forTheTurn",
          condition: {
            kind: "zoneCount",
            seat: "mine",
            zone: "hand",
            op: "lte",
            value: 6,
            raw: "you have 6 or fewer cards in your hand",
          },
        },
      ],
    },
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              suspended: true,
              kind: ["Digimon", "Tamer"],
            },
            count: 1,
          },
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
              suspended: true,
              kind: ["Digimon", "Tamer"],
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
              suspended: true,
              kind: ["Digimon", "Tamer"],
            },
            count: 1,
          },
        },
      ],
    },
    {
      trigger: "EndOfOpponentsTurn",
      actions: [
        {
          kind: "TrashDigivolution",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          amount: 1,
          fromTop: true,
          condition: {
            kind: "selfTopHasText",
            filter: {
              nameOrTrait: [
                {
                  tokens: ["Belphemon: Sleep Mode"],
                  match: "name",
                },
              ],
            },
            raw: "this Digimon is [Belphemon: Sleep Mode]",
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
      names: ["Belphemon: Sleep Mode"],
      cost: 1,
      isAlternate: true,
    },
  ],
};

export { compiled };

registerIrCard("EX10-022", compiled);
