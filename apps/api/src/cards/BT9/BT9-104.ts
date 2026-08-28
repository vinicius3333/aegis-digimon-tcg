// Hand-authored override — do not regenerate.
// [Main]: Reveal top 3. Optionally digivolve 1 of your Digimon into an X Antibody card
//   among them without paying memory cost. Trash the rest.
//   Then place 1 X Antibody card from trash under 1 of your X Antibody Digimon.
// KB Q1911: digivolve bonus draw fires when card is stacked; remaining effects complete after.
// KB Q5976: can't activate WhenDigivolving of the digivolved card before trashing the rest.
// Encoding: RevealAdd.add handles the digivolve (optional), rest:trash handles the remaining.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["X Antibody"],
                  match: "trait",
                },
              ],
            },
            raw: "you have a Digimon with [X Antibody] in its traits in play",
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: {
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["X Antibody"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              to: "digivolve",
              digivolveTarget: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              optional: true,
            },
          ],
          rest: "trash",
        },
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              zone: "trash",
              nameOrTrait: [
                {
                  tokens: ["X Antibody"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          underFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["X Antibody"],
                match: "trait",
              },
            ],
          },
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "RevealAdd",
          optional: true,
          revealCount: 3,
          add: [
            {
              filter: {
                nameOrTrait: [
                  {
                    tokens: ["X Antibody"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              to: "hand",
            },
          ],
          rest: "trash",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT9-104", compiled);
