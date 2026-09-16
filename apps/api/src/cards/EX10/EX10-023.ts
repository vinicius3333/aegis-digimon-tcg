import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Counter",
      actions: [],
      isFromHand: true,
      keywords: [{ keyword: "BlastDigivolve", raw: "＜Blast Digivolve＞" }],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Suspend",
          target: { filter: { controllerDefault: "any", excludeSelf: true, kind: ["Digimon", "Tamer"] }, count: "all" },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Suspend",
          target: { filter: { controllerDefault: "any", excludeSelf: true, kind: ["Digimon", "Tamer"] }, count: "all" },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", suspended: true, kind: ["Digimon"] }, count: 1 },
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "EX10-023/suspended-delete",
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", suspended: true, kind: ["Digimon"] }, count: 1 },
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "EX10-023/suspended-delete",
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Restrict",
          target: { filter: { controllerDefault: "any", excludeSelf: true, kind: ["Digimon", "Tamer"] }, count: "all" },
          restriction: "unsuspendDuringUnsuspendPhase",
          duration: "forTheTurn",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      namesExact: ["Astamon"],
      cost: 7,
      isAlternate: true,
      controllerControls: { kind: ["Digimon", "Tamer"], namesExact: ["Ryoma Mogami"] },
    },
  ],
};

registerIrCard("EX10-023", compiled);
export default compiled;
