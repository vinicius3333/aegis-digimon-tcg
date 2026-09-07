import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

/** BT25-090 Tomoro Tenma — audited against the catalog and KB Q6422-Q6429. */
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourTurn",
      actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } }],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { kind: ["Digimon"] },
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
            kind: ["Option"],
            nameOrTrait: [{ tokens: ["Glowing Dawn"], match: "trait" }],
          },
          cost: {
            kind: "trashBottomFaceDownUnderTamer",
            controller: "mine",
            count: 1,
            raw: "by trashing the bottom face-down card from under any of your Tamers",
          },
          raw: "When you would use a [Glowing Dawn] trait Option card, reduce its use cost by 1.",
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

registerIrCard("BT25-090", compiled);
