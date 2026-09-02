import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          cost: {
            kind: "place",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Royal Knight"], match: "trait" }],
              },
              count: 1,
              from: ["hand"],
            },
            raw: "By placing 1 [Royal Knight] trait Digimon card from your hand as the bottom digivolution card of any of your [King Drasil_7D6]s on the field",
            // CR 2-3-1-2: a bracketed name references only cards with exactly that name.
            // CR 3-4-6: "the field" is the breeding area plus the battle area.
            underFilter: {
              controller: "mine",
              nameOrTrait: [{ tokens: ["King Drasil_7D6"], match: "nameExact" }],
              or: [{ zone: "battleArea" }, { zone: "breeding" }],
            },
            destination: "digivolutionStack",
            position: "bottom",
            host: "target",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Omnimon (X Antibody)"], match: "nameExact" }],
              // The card may be played from hand (unrestricted) or from under one
              // of your King Drasil_7D6s. A top-level hostFilter would incorrectly
              // reject the hand branch.
              or: [
                { zone: "hand" },
                {
                  zone: "digivolutionCards",
                  hostFilter: {
                    controller: "mine",
                    nameOrTrait: [{ tokens: ["King Drasil_7D6"], match: "nameExact" }],
                  },
                },
              ],
            },
            count: 1,
          },
          from: ["hand", "digivolutionCards"],
          payCost: false,
          optional: true,
          condition: { kind: "securityAtMost", controller: "mine", value: 1 },
          bindResultAs: "playedOmnimonX",
        },
        // "Then, place this card ..." is mandatory once the play resolved; it must not open a
        // second "you may". With no play it resolves to no host and quietly does nothing.
        {
          kind: "PlaceUnder",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          underFilter: { controller: "mine", boundRef: "playedOmnimonX", lastPlayed: true },
          position: "bottom",
        },
      ],
    },
    {
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "name",
          tokens: ["X Antibody"],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX11-053", compiled);
