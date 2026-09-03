import type { CompiledCard, Filter, Target } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const machineFilter: Filter = {
  controller: "mine",
  kind: ["Digimon"],
  nameOrTrait: [{ tokens: ["Machine"], match: "trait" }],
};
const cyborgFilter: Filter = {
  controller: "mine",
  kind: ["Digimon"],
  nameOrTrait: [{ tokens: ["Cyborg"], match: "trait" }],
};
const machineOrCyborg: Pick<Target, "filter" | "orFilters"> = {
  filter: machineFilter,
  orFilters: [cyborgFilter],
};
const handMachineFilter: Filter = {
  controller: "mine",
  zone: "hand",
  nameOrTrait: [{ tokens: ["Machine"], match: "trait" }],
};
const handCyborgFilter: Filter = {
  controller: "mine",
  zone: "hand",
  nameOrTrait: [{ tokens: ["Cyborg"], match: "trait" }],
};
const handMachineOrCyborg: Pick<Target, "filter" | "orFilters"> = {
  filter: handMachineFilter,
  orFilters: [handCyborgFilter],
};

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          condition: {
            kind: "youHave",
            filter: {
              zone: "battleArea",
              controllerDefault: "mine",
              kind: ["Digimon"],
              levels: [6],
              nameOrTrait: [{ tokens: ["Machine"], match: "trait" }],
            },
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        { kind: "SelectBind", target: { ...machineOrCyborg, count: 1, bindAs: "chosenMachine" } },
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              relativeTo: { attr: "dp", op: "lte", selectionRef: "chosenMachine" },
            },
            count: 1,
          },
        },
        { kind: "Delete", target: { filter: {}, count: 1, fromSelectionRef: "chosenMachine" } },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              relativeTo: { attr: "playCost", op: "lte", selectionRef: "trashedMachine" },
            },
            count: 1,
          },
          cost: {
            kind: "trash",
            target: { ...handMachineOrCyborg, count: 1 },
            bindResultAs: "trashedMachine",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

export default registerIrCard("BT12-108", compiled);
