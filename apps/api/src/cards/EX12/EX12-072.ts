import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR for EX12-072 (Metal Empire).
//
// {Security}[All Turns] "All of your [ME] trait Digimon gain ＜Guard＞":
//   the persisted record grants a `GainKeyword` named "Guard". That is BOTH untypeable —
//   "Guard" is absent from the `Keyword` union in `packages/shared/src/effects/ir/keywords.ts`,
//   the only type error this module had — and behaviorally empty: nothing in the engine's
//   leave-prevention consult reads a "Guard" keyword grant, so the whole clause was a
//   decorative flag on the keyword ledger.
//
//   ＜Guard＞'s printed reminder text (EX12-056) is "When any of your other Digimon would leave
//   the battle area by your opponent's effects, by deleting this Digimon, they don't leave." So
//   it is executed here the way EX12-056 executes its own printed ＜Guard＞: a `wouldLeavePlay`
//   prevention, `leaveCause: "byOpponentEffect"`, `affectsAll` ("they don't leave"), whose cost
//   deletes one of the [ME] Digimon that HOLDS the granted keyword. The source is the face-up
//   security card itself, so `securityStatic`'s `inFaceUpSecurity` base guard is what keeps the
//   protection alive exactly while this card sits face up in the stack (KB Q6888-Q6891).
//
//   Residual nuance, deliberately not modeled: printed ＜Guard＞ protects a Digimon's OTHER
//   Digimon, so a lone [ME] Digimon cannot save itself. Here the protected pool and the payable
//   pool overlap, but choosing the leaving Digimon as the cost deletes it anyway, so the
//   observable outcome is unchanged. Restoring the visible keyword needs the shared seam in the
//   report ("Guard" added to `Keyword`).
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          condition: {
            kind: "youHave",
            filter: {
              // CR 16-42-3: ＜Use Req.＞ lets a player ignore the color requirements with the
              // specified DIGIMON AND/OR TAMERS on the field. Without this kind gate the
              // youHave count also accepted a matching OPTION permanent — reachable in EX12,
              // where Options such as this one are PLACED IN THE BATTLE AREA and keep their
              // traits, so one resident Option wrongly satisfied the next one's Use Req.
              kind: ["Digimon", "Tamer"],
              controllerDefault: "mine",
              nameOrTrait: [{ tokens: ["ME"], match: "trait" }],
            },
            raw: "you have a card w/[ME] trait",
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      isSecurity: true,
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          leaveCause: "byOpponentEffect",
          affectsAll: true,
          target: {
            filter: { controller: "mine", kind: ["Digimon"] },
            count: "all",
          },
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          cost: {
            kind: "deleteOwn",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["ME"], match: "trait" }],
              },
              count: 1,
            },
            raw: "by deleting 1 of your [ME] trait Digimon with ＜Guard＞",
          },
          raw: "All of your [ME] trait Digimon gain ＜Guard＞ (When any of your other Digimon would leave the battle area by your opponent's effects, by deleting this Digimon, they don't leave.)",
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "toHand",
          controller: "mine",
          amount: 1,
          toTop: false,
        },
        {
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          controller: "mine",
          toTop: false,
          faceUp: true,
        },
      ],
    },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              playCostLte: 5,
              nameOrTrait: [{ tokens: ["ME"], match: "trait" }],
            },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX12-072", compiled);
