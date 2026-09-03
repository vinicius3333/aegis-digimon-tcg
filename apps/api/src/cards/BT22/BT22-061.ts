import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Ver.2"],
                match: "trait",
              },
            ],
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Vademon"], match: "name" }],
          },
          actions: [
            {
              kind: "Replacement",
              event: "wouldDigivolve",
              mode: "reduceCost",
              amount: 1,
              raw: "reduce the digivolution cost by 1",
              scaling: {
                per: 1,
                filter: {
                  isSelfRef: true,
                  faceDown: true,
                },
                unit: "digivolutionCards",
              },
            },
          ],
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Fragment",
          amount: 3,
          raw: "＜Fragment (3)＞",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
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
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
              playCostLte: 4,
            },
            count: 1,
          },
          to: "hand",
          cost: {
            kind: "trash",
            target: {
              filter: {
                isSelfRef: true,
                faceDown: true,
                position: "bottom",
              },
              count: 1,
              isSelf: true,
            },
            raw: "by trashing this Digimon's bottom face-down digivolution card",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
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
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
              playCostLte: 4,
            },
            count: 1,
          },
          to: "hand",
          cost: {
            kind: "trash",
            target: {
              filter: {
                isSelfRef: true,
                faceDown: true,
                position: "bottom",
              },
              count: 1,
              isSelf: true,
            },
            raw: "by trashing this Digimon's bottom face-down digivolution card",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
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
      names: ["Vegiemon"],
      cost: 3,
      isAlternate: true,
    },
    {
      level: 4,
      traits: ["DM"],
      cost: 4,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT22-061", compiled);
