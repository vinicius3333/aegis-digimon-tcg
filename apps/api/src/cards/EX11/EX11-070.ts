// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const maquinamonText = { nameOrTrait: [{ tokens: ["Maquinamon"], match: "text" }] };
const hostGate = {
  kind: "selfTopHasText",
  filter: { nameOrTrait: [{ tokens: ["Maquinamon"], match: "text" }] },
  raw: "this Digimon has [Maquinamon] in its text",
};

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Security",
      actions: [
        { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
      ],
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
          into: { controllerDefault: "mine", zone: "hand", nameOrTrait: [{ tokens: ["ExMaquinamon"], match: "name" }] },
          payCost: true,
          optional: true,
        },
        {
          kind: "MindLink",
          target: { filter: { controller: "mine", kind: ["Digimon"], ...maquinamonText }, count: 1 },
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "MinDpFloor",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          floor: 1000,
          duration: "permanent",
          condition: hostGate,
        },
        {
          kind: "StackTrashLock",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          duration: "permanent",
          condition: hostGate,
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
            filter: { controller: "mine", kind: ["Tamer"], nameOrTrait: [{ tokens: ["Unchained"], match: "name" }] },
            count: 1,
          },
          from: ["digivolutionCards"],
          fromOwnDigivolutionStack: true,
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
