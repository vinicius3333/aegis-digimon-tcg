// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [{
        kind: "Modal",
        choose: 1,
        options: [
          [{
            kind: "RevealAdd",
            revealCount: 4,
            add: [{ filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Blue Flare"], match: "trait" }] }, count: 2, to: "hand" }],
            rest: "deckBottom",
          }],
          [{
            kind: "Return",
            target: { filter: { zone: "trash", controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["MetalGreymon"], match: "name" }] }, count: 1 },
            to: "hand",
          }],
        ],
        optionConditions: [null, { kind: "youHave", filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Tamer"], nameOrTrait: [{ tokens: ["Kiriha Aonuma"], match: "name" }] } }],
      }],
    },
    {
      trigger: "OnDeletion",
      actions: [{
        kind: "PlaceUnder",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        underFilter: { controller: "mine", kind: ["Tamer"] },
        optional: true,
      }],
    },
    {
      trigger: "WhenAttacking",
      actions: [{
        kind: "Unsuspend",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        condition: { kind: "opponentHas", filter: { zone: "battleArea", controller: "opponent", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Blue Flare"], match: "trait" }] } },
      }],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT10-019", compiled);

export { compiled };
