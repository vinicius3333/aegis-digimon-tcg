import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q5122 (binding): the 1st effect does NOT trigger when this card is revealed from the deck or
// security stack and then trashed — only when an effect trashes it directly. Both clauses are
// effect-only BY CONSTRUCTION, so neither carries an attribution flag:
//   - `whenTrashedFromDeck` is fired only from the TrashTopDeck action seam
//     (interpreter/actions/resources.ts) — i.e. only when an effect mills the card. A
//     reveal-then-trash search never reaches that seam. `requireByEffect` would be actively WRONG
//     here: its gate reads `trigger.byEffectSeat`/`byEffectCardId`, which the whenTrashedFromDeck
//     payload never sets, so the watcher would stop firing altogether.
//   - the security clause is EffectTiming.OnDiscardSecurity, fired only from
//     GameEngine.fireDiscardedFromSecurity, the effect-driven trash-from-security seam.
// [On Play][When Digivolving]: cost = trash top security; effect = TrashTopDeck x2 + ModifyDP -3000
// on ALL opponent Digimon "for the turn" -> duration "forTheTurn" (UntilEachTurnEnd). NOT
// untilOpponentTurnEnd, which would keep the debuff alive through the opponent's whole turn.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenTrashedFromDeck",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "GainKeyword",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              keyword: {
                keyword: "SecurityAttack",
                amount: -1,
                raw: "＜Security Attack -1＞",
              },
              duration: "untilOpponentTurnEnd",
            },
          ],
        },
      ],
    },
    {
      trigger: "OnDiscardSecurity",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          keyword: {
            keyword: "SecurityAttack",
            amount: -1,
            raw: "＜Security Attack -1＞",
          },
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "CostGatedBlock",
          cost: {
            kind: "trash",
            target: { filter: { controller: "mine", zone: "security", position: "top" }, count: 1 },
            raw: "By trashing your top security card",
          },
          optional: true,
          abortOnDecline: true,
          actions: [
            { kind: "TrashTopDeck", controller: "mine", amount: 2 },
            {
              kind: "ModifyDP",
              target: {
                filter: { controller: "opponent", kind: ["Digimon"] },
                count: "all",
              },
              amount: -3000,
              duration: "forTheTurn",
            },
          ],
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "CostGatedBlock",
          cost: {
            kind: "trash",
            target: { filter: { controller: "mine", zone: "security", position: "top" }, count: 1 },
            raw: "By trashing your top security card",
          },
          optional: true,
          abortOnDecline: true,
          actions: [
            { kind: "TrashTopDeck", controller: "mine", amount: 2 },
            {
              kind: "ModifyDP",
              target: {
                filter: { controller: "opponent", kind: ["Digimon"] },
                count: "all",
              },
              amount: -3000,
              duration: "forTheTurn",
            },
          ],
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [
        {
          keyword: "Barrier",
          raw: "＜Barrier＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 3,
      traits: ["Evil"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX10-041", compiled);

export { compiled };
