// Hand-authored override for BT3-073 (CresGarurumon).
// runtime-effect fix:
// - revealCount scales by opponent's Digimon count in play (1 card per opponent Digimon);
//   encoded via revealScaling (new engine capability — see LANE_D.md).
// - add filter: KB Q1095 says "1 black Lv.5-or-lower OR 1 red Lv.5-or-lower"; encoded
//   with separate orFilters so the player picks either a black card or a red card.
// - levelComparison lte 5 added to the add filter.
// - rest: "deckBottomAnyOrder" (new engine capability — player may order remaining cards).
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Reboot",
          raw: "＜Reboot＞",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 1,
          revealScaling: {
            per: 1,
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            unit: "cards",
          },
          add: [
            {
              filter: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                colors: ["Black"],
                levelComparison: {
                  op: "lte",
                  value: 5,
                },
              },
              orFilters: [
                {
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  colors: ["Red"],
                  levelComparison: {
                    op: "lte",
                    value: 5,
                  },
                },
              ],
              count: 1,
              to: "play",
              optional: true,
            },
          ],
          rest: "deckBottomAnyOrder",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT3-073", compiled);
