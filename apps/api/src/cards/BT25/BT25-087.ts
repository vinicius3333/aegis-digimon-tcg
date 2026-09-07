import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

/** BT25-087 Thomas H. Norstein — audited against the catalog and KB Q6409-Q6414. */
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
          event: "whenEffectAddsToOpponentHand",
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
          raw: "When effects add cards to your opponent's hand, by suspending this Tamer, you may place the top 2 cards of your deck face down under this Tamer.",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          mode: "reduceCost",
          amount: 1,
          into: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["DATA SQUAD"], match: "trait" }] },
          cost: {
            kind: "trashBottomFaceDownUnderTamer",
            controller: "mine",
            count: 1,
            raw: "by trashing the bottom face-down card from under any of your Tamers",
          },
          raw: "When any of your Digimon would digivolve into a [DATA SQUAD] trait Digimon card, by trashing the bottom face-down card from under any of your Tamers, reduce the cost by 1.",
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

registerIrCard("BT25-087", compiled);
