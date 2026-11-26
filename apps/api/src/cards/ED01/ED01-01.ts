import type { CompiledCard, Condition } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const whileYouHaveKanataHondo: Condition = {
  kind: "youHave",
  filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Kanata Hondo"], match: "nameExact" }] },
  raw: "you have [Kanata Hondo]",
};

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [],
      keywords: [{ keyword: "Blitz", raw: "＜Blitz＞" }],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"] },
            count: "all",
            totalDpCap: 6000,
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "GainKeyword",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          keyword: { keyword: "Piercing", raw: "＜Piercing＞" },
          duration: "permanent",
          condition: whileYouHaveKanataHondo,
        },
        {
          kind: "GrantCanAttackUnsuspended",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          duration: "forTheTurn",
          condition: whileYouHaveKanataHondo,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ED01-01", compiled);
