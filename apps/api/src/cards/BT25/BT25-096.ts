import type { CompiledCard, Cost, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const host = {
  controller: "mine",
  zone: "battleArea",
  kind: ["Digimon"],
  nameOrTrait: [{ tokens: ["Gaomon"], match: "name" }],
} satisfies Filter;
const first = {
  kind: "place",
  target: {
    filter: { controller: "mine", nameOrTrait: [{ tokens: ["Gaogamon"], match: "name" }] },
    from: ["trash"],
    count: 1,
  },
  destination: "digivolutionStack",
  position: "bottom",
  host: { filter: host, count: 1 },
  bindHostAs: "gaomonHost",
} satisfies Cost;
const second = {
  kind: "place",
  target: {
    filter: { controller: "mine", nameOrTrait: [{ tokens: ["MachGaogamon"], match: "name" }] },
    from: ["trash"],
    count: 1,
  },
  destination: "digivolutionStack",
  position: "bottom",
  host: { filter: { boundRef: "gaomonHost" }, count: 1 },
} satisfies Cost;
const playThomasFilter = {
  kind: ["Tamer"],
  nameOrTrait: [{ tokens: ["Thomas H. Norstein"], match: "name" }],
} satisfies Filter;
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          mode: "reduceCost",
          amount: 2,
          sourceFilter: { isSelfRef: true },
          cost: { kind: "trashBottomFaceDownUnderTamer", controller: "mine", count: 1 },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "CostGatedBlock",
          cost: { kind: "compound", costs: [first, second] },
          optional: true,
          abortOnDecline: true,
          actions: [
            {
              kind: "Digivolve",
              target: { filter: host, count: 1, fromSelectionRef: "gaomonHost" },
              into: { nameOrTrait: [{ tokens: ["MirageGaogamon"], match: "name" }] },
              from: ["hand"],
              payCost: false,
              ignoreRequirements: true,
              optional: true,
            },
          ],
        },
      ],
    },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Gaomon"], match: "name" }] },
            orFilters: [playThomasFilter],
            count: 1,
            upTo: true,
          },
          from: ["hand", "trash"],
          payCost: false,
        },
        { kind: "AddToHandSelf" },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT25-096", compiled);
