import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
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
          amount: 1,
          choose: true,
        },
        {
          // "This Digimon can't be blocked for the turn" (Q2390): the enforced mechanism is the
          // `unblockable` GrantStatic (BT4-035), not a `Restrict` — no interpreter consumer reads
          // a `beBlocked` restriction. It is a separate sentence, so it applies even when the
          // preceding trash found no opposing digivolution card.
          kind: "GrantStatic",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          grant: "unblockable",
          tokens: [],
          duration: "forTheTurn",
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBeDeleted",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  hostFilter: { isSelfRef: true },
                  nameOrTrait: [
                    {
                      tokens: ["Gomamon"],
                      match: "name",
                    },
                  ],
                },
                count: 1,
              },
              from: ["digivolutionCards"],
              payCost: false,
              optional: true,
            },
          ],
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT14-020", compiled);
