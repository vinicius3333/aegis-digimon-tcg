// Hand-authored override: audit findings verified against engine — IR is faithful.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              playCostLte: 5,
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
              playCostLte: 5,
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
          actions: [],
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "battleArea",
                controller: "mine",
                kind: ["Option"],
                placedInBattleAreaByEffect: true,
              },
              count: 1,
            },
            raw: "by trashing 1 of your Option cards in the battle area, it doesn't leave",
          },
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          // "When THIS Digimon ... would leave": the inherited clause guards only the
          // permanent carrying this card, never every CS Digimon its controller owns.
          // Without `isSelfRef` the replacement installs with a board-wide `protects`
          // predicate, and `controllerDefault` is not read by that predicate's seat gate.
          sourceFilter: {
            isSelfRef: true,
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Cyberdramon", "Justimon"],
                match: "name",
              },
              {
                tokens: ["CS"],
                match: "trait",
              },
            ],
          },
          actions: [],
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "battleArea",
                controller: "mine",
                kind: ["Option"],
                placedInBattleAreaByEffect: true,
              },
              count: 1,
            },
            raw: "by trashing 1 of your Option cards in the battle area, it doesn't leave",
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
      level: 4,
      traits: ["CS"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT23-055", compiled);
