import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Armor Purge", raw: "＜Armor Purge＞" }],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        ...([3, 4, 5] as const).map((level) => ({
          kind: "Return" as const,
          target: { filter: { controller: "opponent" as const, levels: [level] }, count: 1 },
          to: "hand" as const,
        })),
      ],
    },
    {
      trigger: "EndOfAttack",
      actions: [
        {
          kind: "Modal",
          choose: 1,
          labels: ["Unsuspend this Digimon", "Unsuspend 1 of your Tamers"],
          options: [
            [
              {
                kind: "Unsuspend",
                target: {
                  filter: { isSelfRef: true },
                  count: 1,
                  isSelf: true,
                },
              },
            ],
            [
              {
                kind: "Unsuspend",
                target: {
                  filter: { controller: "mine", kind: ["Tamer"] },
                  count: 1,
                },
              },
            ],
          ],
          cost: {
            kind: "place",
            targetIsPermanent: true,
            detachPermanentTop: true,
            destination: "security",
            position: "top",
            target: {
              filter: { isSelfRef: true },
              count: 1,
              isSelf: true,
            },
            raw: "By placing this Digimon's top card as your top security card",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["MagnaGarurumon"],
      colorCount: 3,
      cost: 2,
      isAlternate: true,
    },
  ],
};
registerIrCard("P-153", compiled);
