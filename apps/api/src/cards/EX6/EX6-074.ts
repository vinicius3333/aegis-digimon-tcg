// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Holy Beast", "Archangel", "Fallen Angel"],
                match: "trait",
              },
            ],
          },
          actions: [
            {
              kind: "GainMemory",
              amount: 1,
              cost: { kind: "suspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
              optional: true,
              abortOnDecline: true,
            },
            {
              kind: "Digivolve",
              // The printed clause says "1 of your Digimon", not "that Digimon";
              // the played trait Digimon only arms this watcher.
              target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
              into: {
                controllerDefault: "mine",
                nameOrTrait: [{ tokens: ["Angewomon", "LadyDevimon"], match: "nameExact" }],
              },
              from: ["trash"],
              reduceCost: 1,
              optional: true,
            },
          ],
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "DnaDigivolve",
          materials: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 2,
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            hasDnaDigivolutionRequirement: true,
          },
          payCost: true,
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          payCost: false,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX6-074", compiled);
