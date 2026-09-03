import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT22-041 — hand-authored IR override (AUTO-GENERATED header removed so the regen
// preserves this file).
//
// [On Play] / [When Digivolving]: "You may place 1 yellow card from your hand as your top
// security card." The runtime record dropped the `from`/`source` fields, so the interpreter took
// the SELF-form branch (BT22-041 itself became security). The faithful behavior selects a
// Yellow card FROM HAND and places it on top of security; BT22-041 stays on the battle area.
// canNoSelect:true (=> optional) -> AddSecurityCard(selectedCard) (documented behavior). The hand-
// form is keyed by from:["hand"] + a source filter colors:["Yellow"], which routes the
// interpreter's placeAsSecurity fromLoose branch (interpreter.ts:1625).
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: { isSelfRef: true },
          mode: "reduceCost",
          amount: 6,
          raw: "When this card would be played, if there are 6 or fewer total cards in both players' security stacks, reduce the play cost by 6",
          condition: {
            kind: "totalSecurityCount",
            op: "lte",
            value: 6,
            raw: "there are 6 or fewer total cards in both players' security stacks",
          },
        },
      ],
    },
    {
      trigger: "Static",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "Blocker",
          },
          duration: "permanent",
        },
      ],
      keywords: [],
    },
    {
      trigger: "Static",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "Barrier",
          },
          duration: "permanent",
        },
      ],
      keywords: [],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          controller: "mine",
          from: ["hand"],
          source: {
            filter: {
              controllerDefault: "mine",
              colors: ["Yellow"],
            },
            count: 1,
          },
          toTop: true,
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          controller: "mine",
          from: ["hand"],
          source: {
            filter: {
              controllerDefault: "mine",
              colors: ["Yellow"],
            },
            count: 1,
          },
          toTop: true,
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          actions: [
            {
              kind: "Unsuspend",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
              cost: {
                kind: "trash",
                target: {
                  filter: {
                    controller: "mine",
                    zone: "security",
                    position: "top",
                  },
                  count: 1,
                },
                raw: "by trashing your top security card",
              },
            },
          ],
          raw: "When this Digimon suspends, by trashing your top security card, it unsuspends",
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Chirinmon"],
      cost: 3,
      isAlternate: true,
    },
    {
      level: 5,
      traits: ["CS"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT22-041", compiled);
