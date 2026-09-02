import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q5933: "on the field" = both breeding area and battle area.
// KB Q5934: breeding area digivolve via [On Play] does not trigger [When Digivolving].
// KB Q5935: battle area digivolve via [On Play] DOES trigger [Your Turn] SubTrigger.
// KB Q5936: breeding area digivolve via [On Play] does NOT trigger [Your Turn] SubTrigger.
// KB Q5937: "X in its text" = any part of the card (name, traits, effects, requirements, etc.).
//
// [On Play]: target zone is "field" (both areas). Into filter: Lucemon in name.
// [Your Turn] SubTrigger: fires when ANY of your Digimon digivolve into a Lucemon-named card.
//   sourceFilter: any of your Digimon (no name restriction on the source).
//   digivolveIntoFilter: Lucemon in name.
//   Actions: GainMemory with suspend as its cost (not a cost on the SubTrigger itself).
export const compiled: CompiledCard = {
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
      trigger: "OnPlay",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              or: [{ zone: "battleArea" }, { zone: "breeding" }],
              nameOrTrait: [
                {
                  tokens: ["Lucemon"],
                  match: "text",
                },
              ],
            },
            count: 1,
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Lucemon"],
                match: "name",
              },
            ],
          },
          payCost: false,
          from: ["hand", "trash"],
          optional: true,
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            zone: "battleArea",
          },
          digivolveIntoFilter: {
            nameOrTrait: [
              {
                tokens: ["Lucemon"],
                match: "name",
              },
            ],
          },
          actions: [
            {
              kind: "GainMemory",
              amount: 1,
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

registerIrCard("EX11-067", compiled);
