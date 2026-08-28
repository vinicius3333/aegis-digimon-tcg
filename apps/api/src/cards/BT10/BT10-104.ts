// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const self = { filter: { isSelfRef: true }, count: 1, isSelf: true };
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: self,
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              kind: ["Tamer"],
              nameOrTrait: [{ tokens: ["Nene Amano"], match: "nameExact" }],
            },
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        { kind: "TrashTopDeck", controller: "mine", amount: 3 },
        {
          kind: "PlayFromZone",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["DarkKnightmon"], match: "nameExact" }],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: true,
          optional: true,
          digiXrosMaterialsFrom: ["trash"],
        },
      ],
    },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "Return", target: self, from: ["security"], to: "hand" }],
    },
  ],
  coverage: "full",
  residual: [],
};

export { compiled };
registerIrCard("BT10-104", compiled);
