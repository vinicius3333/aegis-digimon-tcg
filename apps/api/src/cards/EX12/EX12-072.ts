import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Metal Empire grants Guard only from face-up security. The shared live holder
// reaction owns prevention and self-payment; this module grants the printed keyword.
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
              // specified DIGIMON AND/OR TAMERS on the field. CR 3-4-6 defines "the field" as
              // BOTH the battle area and the breeding area, so — unlike free-text pre-keyword
              // color-requirement waivers (CR 3-4-7-8, e.g. EX7-074/LIBERATOR), which can't
              // reference breeding-area info at all — the keyworded ＜Use Req.＞ is satisfied by
              // a matching Digimon sitting in the breeding area too. Without the kind gate below
              // the youHave count also accepted a matching OPTION permanent — reachable in EX12,
              // where Options such as this one are PLACED IN THE BATTLE AREA and keep their
              // traits, so one resident Option wrongly satisfied the next one's Use Req.
              kind: ["Digimon", "Tamer"],
              zone: ["battleArea", "breeding"],
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
          kind: "Aura",
          target: {
            filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["ME"], match: "trait" }] },
            count: "all",
          },
          effect: { kind: "keyword", keyword: { keyword: "Guard", raw: "＜Guard＞" } },
          raw: "All of your [ME] trait Digimon gain ＜Guard＞",
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
