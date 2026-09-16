import { registerIrCard } from "../../engine/effects/interpreter.js";
import type { CompiledCard } from "@aegis/shared";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "opponentHas",
            filter: { controller: "opponent", kind: ["Digimon"] },
            raw: "your opponent has a Digimon",
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          actions: [
            {
              effectTextPart:
                "[Your Turn] When any of your Digimon get linked, by suspending this Tamer, ＜Draw 1＞ and trash 1 card in your hand.",
              kind: "Draw",
              controller: "mine",
              amount: 1,
              cost: {
                kind: "suspend",
                target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                raw: "by suspending this Tamer",
              },
              optional: true,
              abortOnDecline: true,
            },
            {
              kind: "Trash",
              target: { filter: { controller: "mine", zone: "hand" }, count: 1 },
            },
            {
              kind: "AppFuse",
              source: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
              into: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["System", "Life", "Transmutation"], match: "trait" }],
              },
              from: ["trash"],
              optional: true,
            },
          ],
        },
      ],
    },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT24-087", compiled);
