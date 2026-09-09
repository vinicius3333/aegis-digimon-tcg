import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "toHand",
          controller: "mine",
          amount: 1,
          toTop: true,
        },
        {
          kind: "SecurityManipulation",
          op: "addBottom",
          controller: "mine",
          amount: 1,
          source: {
            filter: {
              zone: "hand",
              controller: "mine",
              kind: ["Option"],
              playCostLte: 5,
              colors: ["Yellow", "Purple"],
            },
            count: 1,
            upTo: true,
          },
          condition: {
            kind: "selfHasInDigivolutionCards",
            nameOrTrait: [
              { tokens: ["Wizardmon"], match: "nameExact" },
              { tokens: ["X Antibody"], match: "trait" },
            ],
            raw: "[Wizardmon]/[X Antibody] is in this Digimon's digivolution cards",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "toHand",
          controller: "mine",
          amount: 1,
          toTop: true,
        },
        {
          kind: "SecurityManipulation",
          op: "addBottom",
          controller: "mine",
          amount: 1,
          source: {
            filter: {
              zone: "hand",
              controller: "mine",
              kind: ["Option"],
              playCostLte: 5,
              colors: ["Yellow", "Purple"],
            },
            count: 1,
            upTo: true,
          },
          condition: {
            kind: "selfHasInDigivolutionCards",
            nameOrTrait: [
              { tokens: ["Wizardmon"], match: "nameExact" },
              { tokens: ["X Antibody"], match: "trait" },
            ],
            raw: "[Wizardmon]/[X Antibody] is in this Digimon's digivolution cards",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "opponentEffect",
          sourceFilter: {
            // "When THIS yellow Digimon ... would leave" — the replacement guards only the
            // permanent carrying this card in its digivolution cards (KB Q3092), not every
            // yellow [Data]/[Witchelny] Digimon its controller has.
            isSelfRef: true,
            controllerDefault: "mine",
            kind: ["Digimon"],
            colors: ["Yellow"],
            nameOrTrait: [
              { tokens: ["Data"], match: "trait" },
              { tokens: ["Witchelny"], match: "trait", orPrevious: true },
            ],
          },
          actions: [],
          cost: {
            kind: "trash",
            target: {
              filter: { controller: "mine", zone: "security", position: "top" },
              count: 1,
            },
            raw: "by trashing your top security card, it doesn't leave",
          },
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      // Printed "[Digivolve][Wizardmon]" is a bracketed EXACT name: a substring `names` gate
      // would also accept [Wizardmon (X Antibody)] (BT12-078).
      namesExact: ["Wizardmon"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT19-036", compiled);
