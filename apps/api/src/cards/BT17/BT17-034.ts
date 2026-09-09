import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT17-034 Bulkmon
// [Digivolve][Pulsemon]: Cost 2
// [When Digivolving] If you have 3 or more security cards, 1 of your opponent's Digimon gets
//   -3000 DP for the turn. If you have 3 or fewer security cards, suspend 1 of your
//   opponent's Digimon.
// [All Turns] [Once Per Turn] When a card is trashed from your security stack, if
//   [Leon Alexander] is in this Digimon's digivolution cards, <Recovery +1 (Deck)>.
// Inherited: [All Turns] While this Digimon has [Pulsemon] in its text, it gets +1000 DP.
//
// KB Q2784: at exactly 3 security cards BOTH branches fire — the two clauses are
// independent conditions ("3 or more" and "3 or fewer"), not an if/else.
// [Leon Alexander] is a printed exact name reference, hence `nameExact`; "[Pulsemon] in its
// text" is the substring text-union predicate, hence `match: "text"`.

export const compiled: CompiledCard = {
  effects: [
    // Two INDEPENDENT clauses, not an if/else (KB Q2784): at exactly 3 security cards both
    // fire. Kept as separate effects so neither clause's gate can shadow the other's within a
    // shared action list.
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: -3000,
          duration: "forTheTurn",
          condition: { kind: "securityAtLeast", value: 3 },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Suspend",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          condition: { kind: "securityAtMost", value: 3 },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenCardTrashedFromSecurity",
          sourceFilter: { controller: "mine" },
          actions: [
            {
              kind: "SecurityManipulation",
              op: "addTop",
              controller: "mine",
              source: "deck",
              amount: 1,
              condition: {
                kind: "selfDigivolutionStackHasTrait",
                filter: { nameOrTrait: [{ tokens: ["Leon Alexander"], match: "nameExact" }] },
              },
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Aura",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          effect: { kind: "modifyDP", amount: 1000 },
          while: {
            kind: "selfTopHasText",
            filter: { nameOrTrait: [{ tokens: ["Pulsemon"], match: "text" }] },
            raw: "this Digimon has [Pulsemon] in its text",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  // Printed "[Digivolve][Pulsemon]: Cost 2" — an alternate route on top of the printed
  // Yellow/Green Lv3 cost-3 EvoCosts. Both routes match a Lv3 Pulsemon, so the digivolve
  // intent's `useAlternateCost` selects the cheaper named route.
  digivolutionRequirement: [
    {
      names: ["Pulsemon"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT17-034", compiled);
