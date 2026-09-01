import type { CompiledCard, Filter, Target } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const self: Target = { filter: { isSelfRef: true }, count: 1, isSelf: true };
const saveText: Filter = { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Save"], match: "text" }] };

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: { ...saveText, controller: "mine", zone: "trash" },
            count: 1,
            from: ["trash"],
          },
          underFilter: { isSelfRef: true },
          position: "bottom",
          condition: {
            kind: "not",
            condition: { kind: "selfDigivolutionCountAtLeast", value: 3 },
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          into: { controllerDefault: "mine", ...saveText },
          actions: [
            {
              kind: "Replacement",
              event: "wouldDigivolve",
              mode: "reduceCost",
              amount: 1,
              raw: "by suspending this Tamer and placing 1 card from under one of your Tamers under that Digimon as one of its digivolution cards",
              cost: {
                kind: "suspend",
                target: self,
                raw: "by suspending this Tamer",
              },
              additionalCosts: [
                {
                  kind: "place",
                  target: { filter: { zone: "underTamers", controller: "mine" }, count: 1, from: ["underTamers"] },
                  destination: "digivolutionStack",
                  position: "bottom",
                  host: "target",
                  underFilter: { isTriggerSource: true },
                  raw: "placing 1 card from under one of your Tamers under that Digimon as one of its digivolution cards",
                },
              ],
              optional: true,
              abortOnDecline: true,
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

export default registerIrCard("BT12-097", compiled);
