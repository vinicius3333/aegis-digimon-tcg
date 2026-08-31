// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const self = { filter: { isSelfRef: true }, count: 1, isSelf: true };
// ＜Decode ([Plutomon])＞ is a bracket-only card reference (§2-3-1-2): exact name only, so
// this card's own ZombiePlutomon copies in the digivolution stack do not qualify.
const plutomon = {
  controller: "mine",
  zone: "trash",
  kind: ["Digimon"],
  nameOrTrait: [{ tokens: ["Plutomon"], match: "nameExact" }],
};
const deleteLevel6 = {
  kind: "CostGatedBlock",
  cost: { kind: "trash", target: { filter: { controller: "mine", zone: "hand" }, count: 1 } },
  optional: true,
  abortOnDecline: true,
  actions: [
    {
      kind: "Delete",
      target: {
        filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 6 } },
        count: 1,
      },
    },
  ],
};
const decode = {
  kind: "Replacement",
  event: "wouldLeavePlay",
  mode: "instead",
  leaveCause: "otherThanBattle",
  sourceFilter: { isSelfRef: true },
  actions: [
    {
      kind: "PlayWithoutCost",
      target: { filter: plutomon, count: 1 },
      fromOwnDigivolutionStack: true,
      payCost: false,
      playedByDecode: true,
      optional: true,
    },
  ],
};
const trimHands = [
  { kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: "all", untilHandSize: 4 } },
  {
    kind: "Trash",
    target: { filter: { controller: "opponent", zone: "hand" }, count: "all", untilHandSize: 4 },
    chooser: "opponent",
  },
];
// No [Once Per Turn] is printed on the On Play / When Digivolving / When Attacking clause, so the
// shared key only collapses the three timings onto one ledger entry — it must not cap uses.
const shared = { sharedUseKey: "bt26-079-trash-cost-delete", actions: [deleteLevel6] };

export const compiled: CompiledCard = {
  keywords: [
    { keyword: "SecurityAttack", amount: 1, raw: "＜Security A. +1＞" },
    { keyword: "Retaliation", raw: "＜Retaliation＞" },
    { keyword: "Decode", raw: "＜Decode ([Plutomon])＞" },
  ],
  effects: [
    { trigger: "Static", actions: [decode] },
    {
      trigger: "Main",
      isFromTrash: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: self,
          from: ["trash"],
          payCost: true,
          reduceCostBy: 4,
          assembly: {
            target: {
              filter: {
                controller: "mine",
                zone: "trash",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Plutomon"], match: "nameExact" }],
              },
              count: 1,
            },
            reduceCostBy: 2,
          },
          condition: { kind: "handAtMost", value: 5 },
        },
      ],
    },
    { trigger: "OnPlay", ...shared },
    { trigger: "WhenDigivolving", ...shared },
    { trigger: "WhenAttacking", ...shared },
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      sharedUseKey: "bt26-079-hand-trim",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "opponent", kind: ["Digimon"] },
          actions: trimHands,
        },
        {
          kind: "SubTrigger",
          event: "whenAnyDigivolves",
          sourceFilter: { controller: "opponent", kind: ["Digimon"] },
          actions: trimHands,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  // NOTE: these two fields are documentation only. Runtime legality reads
  // `generated-digivolve-overrides.json` and `ASSEMBLY_REQUIREMENT_OVERRIDES` in
  // packages/shared, which both spell [Plutomon] as a SUBSTRING name gate. See the audit note.
  digivolutionRequirement: [
    { names: ["Plutomon"], cost: 1, isAlternate: true },
    { level: 5, traits: ["TS"], cost: 3, isAlternate: true },
  ],
  assemblyRequirement: [{ reduceCost: 2, materials: [{ names: ["Plutomon"], count: 1 }] }],
};

registerIrCard("BT26-079", compiled);
export default compiled;
