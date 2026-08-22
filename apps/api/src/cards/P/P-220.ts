// @ts-nocheck
import type { Action, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const deDigivolveAndDelete: Action[] = [
  {
    kind: "DeDigivolve",
    target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
    amount: 2,
  },
  {
    kind: "Delete",
    target: { filter: { controller: "both", kind: ["Digimon"] }, count: 1 },
    optional: true,
  },
];

const compiled: CompiledCard = {
  effects: [
    {
      effectKey: "P-220/reboot",
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Reboot", raw: "＜Reboot＞" }],
    },
    {
      effectKey: "P-220/blocker",
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }],
    },
    {
      effectKey: "P-220/on-play",
      trigger: "OnPlay",
      actions: deDigivolveAndDelete,
    },
    {
      effectKey: "P-220/when-digivolving",
      trigger: "WhenDigivolving",
      actions: deDigivolveAndDelete,
    },
    {
      effectKey: "P-220/on-deletion",
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: { op: "lte", value: 6 },
              nameOrTrait: [{ tokens: ["Composite", "Ver.3", "Ver.5"], match: "trait" }],
            },
            count: 2,
            upTo: true,
            distinctLevels: true,
          },
          from: ["trash"],
          payCost: false,
          cost: {
            kind: "return",
            target: {
              filter: {
                zone: "trash",
                controller: "mine",
                nameOrTrait: [{ tokens: ["Composite", "Wicked God", "DM"], match: "trait" }],
              },
              count: 3,
            },
            to: "deckBottom",
            raw: "By returning 3 [Composite], [Wicked God] or [DM] cards from your trash to the bottom of the deck",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-220", compiled);
