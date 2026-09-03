import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Garurumon", "Greymon", "Omnimon"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          to: "hand",
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              kind: ["Tamer"],
              nameOrTrait: [
                {
                  tokens: ["Tai Kamiya"],
                  match: "name",
                },
              ],
            },
            raw: "you have a Tamer with [Tai Kamiya] in its name",
          },
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "DnaDigivolve",
          materials: [
            {
              filter: { isSelfRef: true },
              count: 1,
              zone: "battleArea",
            },
            {
              filter: { controller: "mine", kind: ["Digimon"], excludeSelf: true },
              count: 1,
              zone: "battleArea",
            },
          ],
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            hasDnaDigivolutionRequirement: true,
            zone: "hand",
          },
          payCost: true,
          optional: true,
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Koromon"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT17-007", compiled);
export { compiled };
