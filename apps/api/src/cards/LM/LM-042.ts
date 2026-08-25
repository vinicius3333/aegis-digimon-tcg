// @ts-nocheck
// Hand-fixed IR for LM-042 — faithful to printed text.
// Audit fix (LM audit): "Then, until their turn ends, 1 of their Digimon or Tamers can't
// activate [When Digivolving] effects or unsuspend" is a FRESH choice — the printed text says
// "1 of their Digimon or Tamers", not "that Digimon" — so the lock is no longer pinned to the
// permanent the first sentence suspended. Both halves of the lock land on the same chosen
// permanent, which is what "can't ... or ..." means.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "SecurityAttack",
          amount: 1,
          raw: "＜Security Attack +1＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 1,
          },
          bindResultAs: "rasielmonTarget",
        },
        {
          kind: "SelectBind",
          target: {
            filter: { controller: "opponent", kind: ["Digimon", "Tamer"] },
            count: 1,
            bindAs: "rasielmonLocked",
          },
        },
        {
          kind: "Restrict",
          target: {
            filter: { boundRef: "rasielmonLocked" },
            count: 1,
          },
          restriction: "cannotActivateWhenDigivolving",
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "Restrict",
          target: {
            filter: { boundRef: "rasielmonLocked" },
            count: 1,
          },
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 1,
          },
          bindResultAs: "rasielmonTarget",
        },
        {
          kind: "SelectBind",
          target: {
            filter: { controller: "opponent", kind: ["Digimon", "Tamer"] },
            count: 1,
            bindAs: "rasielmonLocked",
          },
        },
        {
          kind: "Restrict",
          target: {
            filter: { boundRef: "rasielmonLocked" },
            count: 1,
          },
          restriction: "cannotActivateWhenDigivolving",
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "Restrict",
          target: {
            filter: { boundRef: "rasielmonLocked" },
            count: 1,
          },
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          controller: "mine",
          // No `source`: the self form addresses the resolving card's own instance, which is the
          // only shape that still resolves once the permanent has left the battle area. A
          // self-targeted `source` resolves through the battle area and finds nothing on deletion.
          toTop: false,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      traits: ["Angel", "Archangel"],
      cost: 3,
      isAlternate: true,
    },
  ],
};
registerIrCard("LM-042", compiled);
