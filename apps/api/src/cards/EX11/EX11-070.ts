// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const self = { filter: { isSelfRef: true }, count: 1, isSelf: true };
const maquinamonText = { controller: "mine", kind: ["Digimon"], textContains: "Maquinamon" };

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Security",
      actions: [{ kind: "PlayWithoutCost", target: self, payCost: false }],
      isSecurity: true,
    },
    {
      trigger: "StartOfYourTurn",
      actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } }],
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "DnaDigivolve",
          materials: { filter: { controller: "mine", kind: ["Digimon"] }, count: 2 },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["ExMaquinamon"], match: "name" }],
          },
          payCost: true,
          optional: true,
        },
        {
          kind: "MindLink",
          target: { filter: maquinamonText, count: 1 },
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "MinDpFloor",
          target: self,
          floor: 1000,
          duration: "permanent",
          condition: {
            kind: "selfTopHasText",
            filter: { nameOrTrait: [{ tokens: ["Maquinamon"], match: "text" }] },
          },
        },
        {
          kind: "StackTrashLock",
          target: self,
          duration: "permanent",
          condition: {
            kind: "selfTopHasText",
            filter: { nameOrTrait: [{ tokens: ["Maquinamon"], match: "text" }] },
          },
        },
      ],
      isInherited: true,
    },
    {
      trigger: "EndOfAllTurns",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Tamer"],
              nameOrTrait: [{ tokens: ["Unchained"], match: "name" }],
            },
            count: 1,
          },
          from: ["digivolutionCards"],
          payCost: false,
          optional: true,
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX11-070", compiled);
