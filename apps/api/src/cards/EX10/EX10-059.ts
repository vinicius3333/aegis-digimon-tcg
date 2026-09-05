import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const paidDeleteActions = [
  {
    kind: "PlaceUnder" as const,
    target: {
      filter: {
        zone: "trash" as const,
        controller: "mine" as const,
        kind: ["Digimon" as const],
        nameOrTrait: [{ tokens: ["Bagra Army"], match: "trait" as const }],
      },
      count: 3,
      from: ["trash" as const],
    },
    position: "top" as const,
    optional: true,
    abortOnDecline: true,
  },
  {
    kind: "Delete" as const,
    target: {
      filter: {
        controller: "opponent" as const,
        kind: ["Digimon" as const, "Tamer" as const],
        hasDigivolutionCards: true,
      },
      count: 1,
    },
  },
];

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlaceUnder",
          blind: true,
          target: {
            filter: {
              isOpponentHand: true,
              controller: "opponent",
              zone: "hand",
            },
            count: 1,
            from: ["hand"],
          },
          // Q5162-Q5165: the host is any of the opponent's Digimon (as its BOTTOM digivolution
          // card) or any of their Tamers. The previous shape encoded the destination POSITION as
          // a filter branch (`or: [{ digivolutionBottom: true }, { kind: ["Tamer"] }]`);
          // `digivolutionBottom` is not a Filter field and nothing reads it, so that OR branch
          // matched unconditionally and the host filter degenerated to "any opposing permanent",
          // Option cards included. The position is already carried by `position: "bottom"`.
          underFilter: { controller: "opponent", kind: ["Digimon", "Tamer"] },
          position: "bottom",
        },
        ...paidDeleteActions,
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlaceUnder",
          blind: true,
          target: {
            filter: {
              isOpponentHand: true,
              controller: "opponent",
              zone: "hand",
            },
            count: 1,
            from: ["hand"],
          },
          // Q5162-Q5165: the host is any of the opponent's Digimon (as its BOTTOM digivolution
          // card) or any of their Tamers. The previous shape encoded the destination POSITION as
          // a filter branch (`or: [{ digivolutionBottom: true }, { kind: ["Tamer"] }]`);
          // `digivolutionBottom` is not a Filter field and nothing reads it, so that OR branch
          // matched unconditionally and the host filter degenerated to "any opposing permanent",
          // Option cards included. The position is already carried by `position: "bottom"`.
          underFilter: { controller: "opponent", kind: ["Digimon", "Tamer"] },
          position: "bottom",
        },
        ...paidDeleteActions,
      ],
    },
    {
      trigger: "AllTurns",
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
          // Typed structured form of the stack-effect conferral (grantStatic.ts "effects" +
          // `filter` path). The previous object-shaped `grant: { copyEffectsFromDigivolution:
          // { filter: "<printed clause>" } }` is not assignable to `GrantStaticAction.grant`
          // (a string) and relied on `parseCopyEffectsFilterText` re-deriving the filter from
          // prose — which also dropped the "Digimon cards" restriction. This filter states the
          // three printed predicates directly: Digimon, level 6, [Bagra Army] trait.
          //
          // `copyTrigger` narrows the conferral to the stack cards' [All Turns] effects, which is
          // what the clause prints. `collectConferredEffects` compares it against `irTrigger` —
          // the raw IR trigger string — so the value is the IR spelling "AllTurns". Without it a
          // level-6 [Bagra Army] stack card's [On Play] / [When Digivolving] effects would be
          // conferred as well.
          grant: "effects",
          copyTrigger: "AllTurns",
          filter: {
            kind: ["Digimon"],
            levels: [6],
            nameOrTrait: [{ tokens: ["Bagra Army"], match: "trait" }],
          },
          duration: "permanent",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digiXrosRequirement: [
    {
      materials: [
        {
          names: ["Bagramon"],
        },
        {
          names: ["DarkKnightmon"],
        },
      ],
      count: 3,
      costReduction: 3,
    },
  ],
};

registerIrCard("EX10-059", compiled);

export { compiled };
