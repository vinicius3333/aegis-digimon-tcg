import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            { filter: { nameOrTrait: [{ tokens: ["Gabumon", "Garurumon"], match: "name" }] }, count: 1, to: "hand" },
          ],
          rest: "deckBottom",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectAddsToHand",
          fireCondition: {
            kind: "triggerByYourDigimonEffect",
            raw: "one of your Digimon's effects adds cards to your hand",
          },
          actions: [
            { kind: "Suspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, optional: true },
            {
              kind: "GainMemory",
              amount: 1,
              condition: { kind: "ifThisEffectActed", raw: "by suspending this Tamer" },
            },
          ],
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT15-083", compiled);
export { compiled };
