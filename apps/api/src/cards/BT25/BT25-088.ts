import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

/** BT25-088 Kyo Sawashiro — audited against the catalog and KB Q6415-Q6421. */
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourTurn",
      actions: [
        {
          kind: "SetMemory",
          value: 3,
          condition: { kind: "memoryAtMost", value: 2, raw: "you have 2 or less memory" },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          optional: true,
          actions: [
            { kind: "PlaceUnder", target: { filter: {}, count: 1 }, fromDeckTop: true, position: "bottom" },
            { kind: "PlaceUnder", target: { filter: {}, count: 1 }, fromDeckTop: true, position: "bottom" },
          ],
          cost: {
            kind: "suspend",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            raw: "by suspending this Tamer",
          },
          raw: "When your security stack is removed from, by suspending this Tamer, you may place the top 2 cards of your deck face down under this Tamer.",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          mode: "reduceCost",
          amount: 1,
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon", "Tamer"],
            excludeKind: ["Option"],
            nameOrTrait: [{ tokens: ["Glowing Dawn"], match: "trait" }],
          },
          cost: {
            kind: "trashBottomFaceDownUnderTamer",
            controller: "mine",
            count: 1,
            raw: "by trashing the bottom face-down card from under any of your Tamers",
          },
          raw: "When any of your [Glowing Dawn] trait cards would be played, by trashing the bottom face-down card from under any of your Tamers, reduce the cost by 1.",
        },
      ],
      frequency: "OncePerTurn",
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

registerIrCard("BT25-088", compiled);
