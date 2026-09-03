import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT18-037 Lobomon
// [Digivolve] [Koji Minamoto]: Cost 2
// [Digivolve] [KendoGarurumon]: Cost 0
// [When Digivolving] Search your security stack. You may add 1 card with the
//   [Hybrid]/[Ten Warriors] trait among them to your hand. If you added,
//   <Recovery +1 (Deck)>. Then, shuffle your security stack.
// [When Attacking] (inherited) If you have 7 or fewer cards in your hand, draw 1.
//
// KB Q2957: digivolving from Koji Minamoto Tamer is NOT treated as a Digimon digivolving.
// KB Q2958: "when a Digimon would digivolve" effects don't trigger for Tamer digivolution.
// KB Q2959: "when a Digimon digivolves" effects don't trigger.
// KB Q2960: you can choose NOT to add to hand; if you don't add, shuffle without Recovery.
//
// digivolutionRequirement for Koji Minamoto uses baseIsTamer:true.
// The [When Digivolving] searches the security stack for [Hybrid]/[Ten Warriors] cards,
// adds one optionally, triggers Recovery +1 (Deck) if added, then shuffles the security.
// Recovery +1 is a GainKeyword action (fires the verb immediately per interpreter).
// The security stack shuffle is a SecurityManipulation with op:"shuffle".
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Search",
          controller: "mine",
          searchZone: "security",
          filter: {
            controller: "mine",
            nameOrTrait: [
              {
                tokens: ["Hybrid", "Ten Warriors"],
                match: "trait",
              },
            ],
          },
          count: 1,
          to: "hand",
          bindResultAs: "searched",
          optional: true,
        },
        {
          kind: "Recover",
          amount: 1,
          condition: {
            kind: "bindingExists",
            ref: "searched",
            raw: "if you added",
          },
        },
        {
          kind: "SecurityManipulation",
          op: "shuffle",
          controller: "mine",
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          condition: {
            kind: "zoneCount",
            seat: "mine",
            zone: "hand",
            op: "lte",
            value: 7,
            raw: "you have 7 or fewer cards in your hand",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Koji Minamoto"],
      cost: 2,
      isAlternate: true,
      baseIsTamer: true,
    },
    {
      names: ["KendoGarurumon"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT18-037", compiled);
