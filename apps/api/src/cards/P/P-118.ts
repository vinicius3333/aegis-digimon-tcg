// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q4226: if only one target type is found, add just that one.
// KB Q4227: "green or blue card with 2 or more colors" means green+blue multicolor card.
// KB Q4228: if both target types found, MUST add both (not optional per type).
// Inherited: [End Of Your Turn] DNA Digivolve using self + another Digimon, into hand card.
const compiled: CompiledCard = {
  effects: [
    {
      // [On Play] Reveal top 3 cards. Add up to 1 green-or-blue multicolor card AND up to 1
      // Ken Ichijoji Tamer. Must add as many matching targets as are available (KB Q4228).
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              // "green or blue card with 2 or more colors" = a card that is BOTH green and blue
              // (i.e., a green/blue multicolor card). KB Q4227 confirms "green/blue or blue/green"
              // means the card must have both colors. Use colors (AND-match) + multicolor:true.
              filter: {
                controllerDefault: "mine",
                multicolor: true,
                colors: ["Blue", "Green"],
              },
              count: 1,
              to: "hand",
              mandatory: true,
            },
            {
              filter: {
                controllerDefault: "mine",
                kind: ["Tamer"],
                nameOrTrait: [{ tokens: ["Ken Ichijoji"], match: "name" }],
              },
              count: 1,
              to: "hand",
              mandatory: true,
            },
          ],
          rest: "deckBottom",
          addAsManyAsPossible: true,
        },
      ],
    },
    {
      // [Inherited] [End Of Your Turn] DNA Digivolve using this Digimon and 1 other of your
      // Digimon in play, into a Digimon card in your hand.
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "DnaDigivolve",
          materials: [
            {
              filter: { isSelfRef: true },
              count: 1,
              isSelf: true,
            },
            {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                excludeSelf: true,
              },
              count: 1,
            },
          ],
          into: {
            controller: "mine",
            kind: ["Digimon"],
            zone: "hand",
          },
          from: ["hand"],
          payCost: true,
          optional: true,
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-118", compiled);
