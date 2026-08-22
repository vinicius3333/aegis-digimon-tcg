// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [{
        kind: "RevealAdd",
        revealCount: 5,
        add: [{
          filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Bagra Army"], match: "trait" }] },
          count: 1,
          to: "hand",
        }],
        rest: "deckBottom",
        cost: {
          kind: "deleteOwn",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        },
      }],
    },
    {
      trigger: "OnDeletion",
      actions: [{
        kind: "PlaceUnder",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        underFilter: { controller: "mine", kind: ["Tamer"] },
        optional: true,
      }],
      keywords: [{ keyword: "Save", raw: "＜Save＞" }],
    },
    {
      trigger: "OpponentsTurn",
      actions: [{
        kind: "SubTrigger",
        event: "onDigivolutionCardDiscarded",
        sourceFilter: { isSelfRef: true },
        actions: [{ kind: "GainMemory", amount: 1 }],
      }],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT11-077", compiled);
