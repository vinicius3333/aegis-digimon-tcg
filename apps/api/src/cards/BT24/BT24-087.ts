// @ts-nocheck
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Rei Katsura. Start of Main: gain memory if the opponent has a Digimon. When
// this Tamer's linked host gets linked on your turn, suspend this Tamer, draw,
// trash a hand card, then optionally App Fuse one of your Digimon into a System,
// Life, or Transmutation card from the trash.
export const compiled = {
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
