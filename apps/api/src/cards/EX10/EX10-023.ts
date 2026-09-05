import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Q5074: the two When Digivolving effects are simultaneous and independently
// ordered. Q5075: the All Turns restriction also covers the unsuspend phase.
//
// The unsuspend lock uses "forTheTurn" (EffectDuration.UntilEachTurnEnd). An [All Turns]
// static is re-derived on every continuous pass, so the lock is reapplied for as long as
// Quartzmon stays on the field; the previously written "untilEachTurnEnd" was not a member
// of EffectDurationRef and only reached the same EffectDuration through toDuration's
// default branch.
//
// "While you have [Ryoma Mogami]" is a "you have" clause (CR 16-42-3): it is satisfied by a
// Digimon OR a Tamer with that name, so the gate is not narrowed to Tamers.
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
