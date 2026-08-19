// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT22-086 Yao Qinglan.
// Q4956: the "Then" clause is unavailable unless the "by" return cost is paid.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [{ tokens: ["Yao Qinglan"], match: "name" }],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          cost: {
            kind: "return",
            to: "deckBottom",
            target: {
              filter: { isSelfRef: true },
              count: 1,
              isSelf: true,
            },
            raw: "By returning this Tamer to the bottom of the deck",
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [{ tokens: ["Sangomon"], match: "name" }],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          condition: {
            kind: "youHaveNone",
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
            },
            raw: "you don't have a Digimon",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          sourceFilter: { controllerDefault: "mine" },
          triggerFilter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Aqua", "Sea Animal"], match: "trait" }],
          },
          actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
          cost: {
            kind: "suspend",
            target: {
              filter: { isSelfRef: true },
              count: 1,
              isSelf: true,
            },
            raw: "by suspending this Tamer",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
          payCost: false,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT22-086", compiled);
