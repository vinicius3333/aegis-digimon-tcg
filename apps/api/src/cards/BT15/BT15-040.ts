import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              or: [
                {
                  nameOrTrait: [
                    {
                      tokens: ["Numemon"],
                      match: "name",
                    },
                  ],
                },
                {
                  levels: [3],
                },
              ],
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          condition: {
            kind: "selfDigivolutionStackHasTrait",
            filter: {
              nameOrTrait: [
                {
                  tokens: ["Monzaemon"],
                  match: "name",
                },
                {
                  tokens: ["X Antibody"],
                  match: "trait",
                },
              ],
            },
            raw: "a card with [Monzaemon] in its name or [X Antibody] is in this Digimon's digivolution cards",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "mine",
            excludeSelf: true,
            kind: ["Digimon"],
          },
          actions: [
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
              scaling: {
                per: 1,
                filter: { controller: "mine", kind: ["Digimon"] },
                unit: "cards",
              },
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT15-040", compiled);
export { compiled };
