// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored override for EX2-072 (Blue Card).
// runtime-effect fixes:
// - [Static] WaiveColorRequirement conditional on having a Tamer in play — preserved.
// - [Main] RevealAdd: text says "You may digivolve 1 of your Digimon into 1 non-white Digimon
//   card among them without paying its memory cost. If you don't, add 1 Digimon card among
//   them to your hand."
//   Faithful encoding: RevealAdd with a digivolveOption (choose a non-white Digimon card from
//   the revealed set and digivolve a Digimon into it for free, optional) plus a fallback add
//   that only fires if the digivolve was declined. Remaining cards go to deck bottom in any order.
//   (Requires new engine cap CAP-C-21: RevealAdd.digivolveOption + ifDigivolveDeclined on add.)
//   KB Q3362 confirms digivolve is optional; Q3363 digivolve bonus draw from un-revealed deck.
// - rest: "deckBottomAnyOrder" per KB Q3362 "return remaining cards to the bottom... in any order".
// - [Security] PlayWithoutCost a Tamer from hand — preserved.
const compiled: CompiledCard = {
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
              zone: "battleArea",
              controllerDefault: "mine",
              kind: ["Tamer"],
            },
            raw: "you have a Tamer in play",
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 5,
          digivolveOption: {
            into: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              excludeColors: ["White"],
            },
            payCost: false,
            optional: true,
          },
          add: [
            {
              filter: {
                controllerDefault: "mine",
                kind: ["Digimon"],
              },
              count: 1,
              to: "hand",
              ifDigivolveDeclined: true,
            },
          ],
          rest: "deckBottomAnyOrder",
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
              controller: "mine",
              kind: ["Tamer"],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX2-072", compiled);
