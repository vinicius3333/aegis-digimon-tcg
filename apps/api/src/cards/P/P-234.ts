// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Q6522: does NOT trigger when a link card is trashed and replaced on an already-linked card.
// SubTrigger event "whenLinkTrashed" (the only link-card-trash event the engine's `trash`
// primitive actually fires — apps/api/src/engine/effects/primitives.ts; "whenLinkCardTrashed"/
// "whenLinkCardTrashedByEffect" are catalog-only aliases nothing ever fires). sourceFilter
// controller "mine" + kind ["Digimon"] (text: "any of YOUR Digimon's link cards") replaces the
// nonstandard sourceFilter.cause/notLinkReplacement + triggerFilter fields previously here —
// none of those keys are read by the interpreter's generic subjectMatchesFilter gate
// (interpreter.ts ~4526), so they were silently ignored; the standard Filter shape below is
// what the engine actually evaluates, and already excludes link-replacement per the `trash`
// primitive's own contract (KB-confirmed, see comment above).
//
// The [Your Turn] body is a real `Link` action (BT25-089's pattern), not the unrecognized
// "LinkCard" kind / "costReduction" field a prior pass left behind: `cost` (the suspend-this-
// Tamer cost) sits on the Link action itself per ActionBase, `costDelta: -2` is the signed
// link-cost adjustment, `from: ["hand"]` scopes the link material (text says "from your hand"
// only), and `recipient` lets the controller choose which of their Digimon receives the link
// (the text names no specific recipient, so it resolves like every other undirected "link ...
// to 1 of your Digimon" clause in the catalog).
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 4,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                nameOrTrait: [
                  {
                    tokens: ["System", "Navi", "Tool", "Leviathan"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              to: "hand",
            },
          ],
          rest: "deckBottom",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinkTrashed",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "Link",
              optional: true,
              cost: {
                kind: "suspend",
                target: {
                  filter: {
                    isSelfRef: true,
                  },
                  count: 1,
                  isSelf: true,
                },
                raw: "by suspending this Tamer",
              },
              target: {
                filter: {
                  controller: "mine",
                  nameOrTrait: [
                    {
                      tokens: ["System", "Navi", "Tool", "Leviathan"],
                      match: "trait",
                    },
                  ],
                },
                count: 1,
              },
              recipient: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              from: ["hand"],
              costDelta: -2,
              raw: "by suspending this Tamer, you may link 1 [System], [Navi], [Tool] or [Leviathan] trait card from your hand with the cost reduced by 2",
            },
          ],
          raw: "whenLinkTrashed",
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          payCost: false,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-234", compiled);
