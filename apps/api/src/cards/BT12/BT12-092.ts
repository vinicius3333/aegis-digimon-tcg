import type { CompiledCard, Filter, Target } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const self: Target = { filter: { isSelfRef: true }, count: 1, isSelf: true };
const agumonOrGreymon: Filter = {
  controller: "mine",
  kind: ["Digimon"],
  nameOrTrait: [{ tokens: ["Agumon", "Greymon"], match: "name" as const }],
};

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "CostGatedBlock",
          condition: { kind: "youHave", filter: agumonOrGreymon },
          cost: { kind: "payMemory", memory: 1, raw: "by paying 1 memory" },
          optional: true,
          abortOnDecline: true,
          actions: [
            {
              kind: "GrantStatic",
              target: self,
              grant: "kinds",
              tokens: ["Digimon"],
              duration: "forTheTurn",
            },
            { kind: "SetBaseDP", target: self, value: 3000, duration: "forTheTurn" },
            { kind: "Restrict", target: self, restriction: "digivolve", duration: "forTheTurn" },
          ],
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Digivolve",
              target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
              into: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                colors: ["Yellow"],
                nameOrTrait: [{ tokens: ["Greymon"], match: "name" }],
              },
              from: ["hand"],
              payCost: false,
              optional: true,
            },
          ],
        },
      ],
    },
    {
      trigger: "Security",
      actions: [{ kind: "PlayWithoutCost", target: self, payCost: false }],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

export default registerIrCard("BT12-092", compiled);
