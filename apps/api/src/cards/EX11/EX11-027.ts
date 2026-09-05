import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Maquinamon"], match: "nameExact" }] },
              count: 1,
              to: "hand",
            },
            {
              filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Maquinamon"], match: "text" }] },
              count: 1,
              to: "hand",
            },
          ],
          rest: "deckBottom",
        },
        {
          kind: "Link",
          target: {
            filter: { isSelfRef: true },
            orFilters: [{ controller: "mine", nameOrTrait: [{ tokens: ["Maquinamon"], match: "nameExact" }] }],
            count: 1,
          },
          recipient: {
            filter: { controller: "mine", kind: ["Digimon"], excludeSelf: true },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
        },
      ],
    },
    // Printed LINK effect (catalog `linkEffect`), active only while this card is plugged in
    // sideways with a host Digimon: "[All Turns] When this Digimon would leave the battle area,
    // by placing 1 of its link cards as its bottom digivolution card, it doesn't leave."
    // `isLinked` scopes the window to the linked state; "this Digimon" is the HOST, which is what
    // `ctx.source.permanent()` resolves to for a linked source, so `isSelfRef` covers both the
    // protected permanent and the pool of "its link cards" (zone `linked`). A Replacement whose
    // cost is present with no payload actions resolves as mode "prevent". KB Q5823: the placement
    // still fires "when digivolution cards are added" watchers; Q5824 excludes ＜Mind Link＞ cards,
    // which never enter `linked`.
    {
      trigger: "AllTurns",
      isLinked: true,
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: { isSelfRef: true },
          actions: [],
          cost: {
            kind: "place",
            target: { filter: { isSelfRef: true, zone: "linked" }, from: ["linked"], count: 1 },
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
            raw: "by placing 1 of its link cards as its bottom digivolution card, it doesn't leave",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 2, texts: ["Maquinamon"], cost: 0, isAlternate: true }],
};

registerIrCard("EX11-027", compiled);
export default compiled;
