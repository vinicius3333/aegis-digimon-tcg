import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          sourceFilter: {
            controller: "mine",
            excludeSelf: true,
            kind: ["Digimon"],
            nameOrTrait: [
              { tokens: ["Apocalymon"], match: "name" },
              { tokens: ["Dark Masters"], match: "trait" },
            ],
          },
          leaveCause: "otherThanYourEffect",
          cost: {
            kind: "deleteOwn",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            raw: "by deleting this Digimon",
          },
          raw: "[All Turns] When one of your [Apocalymon] or Digimon with the [Dark Masters] trait would leave the battle area other than by one of your effects, by deleting this Digimon, prevent 1 of those Digimon from leaving.",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT15-072", compiled);
export { compiled };
