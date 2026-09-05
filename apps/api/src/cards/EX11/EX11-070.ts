import type { CompiledCard, Filter, Target } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const self: Target = { filter: { isSelfRef: true }, count: 1, isSelf: true };
// `textContains` IS read by the interpreter (matching/definition.ts: name ∪ traits ∪ effect text
// ∪ inherited text, KB Q5942), so the clause is live. The type error was the untyped const
// widening `controller`/`kind` to `string`/`string[]`; annotating it keeps the literal types.
const maquinamonText: Filter = { controller: "mine", kind: ["Digimon"], textContains: "Maquinamon" };

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
            nameOrTrait: [{ tokens: ["ExMaquinamon"], match: "nameExact" }],
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
              nameOrTrait: [{ tokens: ["Unchained"], match: "nameExact" }],
              // "from THIS Digimon's digivolution cards". The engine only auto-scopes a
              // `digivolutionCards` play to its host for ＜Decode＞ (play.ts applyDecodeHostScope),
              // so without this the clause pooled every Unchained under any of the controller's
              // Digimon.
              hostFilter: { isSelfRef: true },
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
