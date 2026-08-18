import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX3-063 Imperialdramon: Dragon Mode — official errata applied. The opponent
// chooses the single survivor; both that choice and Blitz exist only after DNA.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: { controllerDefault: "opponent", kind: ["Digimon"] },
            count: "all",
            except: {
              filter: { controllerDefault: "opponent", kind: ["Digimon"] },
              count: 1,
              chooser: "opponent",
            },
          },
          condition: {
            kind: "isDnaDigivolving",
            raw: "DNA digivolving",
          },
        },
        {
          kind: "GainKeyword",
          target: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
          keyword: { keyword: "Blitz", raw: "＜Blitz＞" },
          duration: "forTheTurn",
          condition: {
            kind: "isDnaDigivolving",
            raw: "DNA digivolving",
          },
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
          amount: 2000,
          duration: "forTheTurn",
        },
        {
          kind: "Digivolve",
          target: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
          into: {
            controllerDefault: "mine",
            nameOrTrait: [{ tokens: ["Imperialdramon: Fighter Mode"], match: "name" }],
          },
          from: ["hand"],
          payCost: true,
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  dnaDigivolveRequirement: [
    {
      cost: 0,
      materials: [
        { color: "Purple", level: 5 },
        { color: "Red", level: 5 },
      ],
    },
  ],
};

registerIrCard("EX3-063", compiled);
