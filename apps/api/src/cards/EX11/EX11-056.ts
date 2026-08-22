// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q5909 (binding): triggers when any of your Digimon digivolve INTO a level 5+
//   Digimon with [Tyrannomon] in its name or the [Dinosaur] trait — filter is on the
//   digivolved-INTO card (digivolveIntoFilter), not the source Digimon.
// KB Q5910 (binding): if you don't suspend this Tamer, you cannot process the "after" clause
//   (hatch and digivolve). Suspend is the cost; abortOnDecline gates the Digivolve.
// SubTrigger.sourceFilter: any of your Digimon (no name/trait restriction on the source).
// SubTrigger.digivolveIntoFilter: lv.5+ and (Tyrannomon name OR Dinosaur trait).
// Hatch is "you may" (optional), with suspend as its cost. If declined (no suspend), abort.
// Digivolve target: must be in breeding area.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourTurn",
      actions: [
        {
          kind: "SetMemory",
          value: 3,
          condition: {
            kind: "memoryAtMost",
            value: 2,
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
          },
          digivolveIntoFilter: {
            levelComparison: {
              op: "gte",
              value: 5,
            },
            nameOrTrait: [
              {
                tokens: ["Tyrannomon"],
                match: "name",
              },
              {
                tokens: ["Dinosaur"],
                match: "trait",
              },
            ],
          },
          actions: [
            {
              kind: "Hatch",
              controller: "mine",
              optional: true,
              cost: {
                kind: "suspend",
                target: {
                  filter: {
                    isSelfRef: true,
                  },
                  count: 1,
                  isSelf: true,
                },
                raw: "by suspending this Tamer",
              },
              abortOnDecline: true,
            },
            {
              kind: "Digivolve",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  zone: "breedingArea",
                },
                count: 1,
              },
              into: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Tyrannomon"],
                    match: "name",
                  },
                  {
                    tokens: ["Reptile", "Dinosaur"],
                    match: "trait",
                  },
                ],
              },
              payCost: false,
              from: ["hand"],
              optional: true,
            },
          ],
        },
      ],
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

registerIrCard("EX11-056", compiled);
