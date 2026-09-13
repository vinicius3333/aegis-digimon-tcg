// Hand-fixed IR for P-153 — faithful text encoding.
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
        // These queued actions all resolve before the effect settles; each level
        // has its own one-card quota, preserving the printed one-each requirement.
        ...([3, 4, 5] as const).map((level) => ({
          kind: "Return" as const,
          target: { filter: { controller: "opponent" as const, levels: [level] }, count: 1 },
          to: "hand" as const,
        })),
      ],
    },
    {
      // [End of Attack] By placing this Digimon's top card as your top security card,
      // unsuspend this Digimon or Tamer.
      // The existing detachPermanentTop seam promotes the visible top card from
      // this permanent to the top of its owner's security stack.
      trigger: "EndOfAttack",
      actions: [
        {
          kind: "Modal",
          choose: 1,
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
