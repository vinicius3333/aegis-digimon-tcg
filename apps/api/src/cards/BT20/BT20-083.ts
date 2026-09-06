import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// HAND-FIXED IR for BT20-083 — do not regenerate.
//
// [On Play]: "If you have 1 or fewer security cards, this Digimon may digivolve into
// [Omnimon (X Antibody)] in the hand, ignoring digivolution requirements and without paying
// the cost." The runtime record dropped the security-count gate, so the digivolve fired
// unconditionally. The faithful behavior gates the digivolve on the controller having <= 1
// The gate is the real IR Condition kind "securityAtMost" value:1 (ir.ts:300;
// interpreter.ts:629 reads player(mine).security.length <= value), NOT the illustrative
// securityCount.lte shape from earlier notes.
//
// [On Deletion]: Fixed target from wrong {zone:"hand"} to isSelf (this deleted card),
// and underFilter to King Drasil_7D6 (controller:mine). The text says "place this card
// as the bottom digivolution card of your [King Drasil_7D6] in the breeding area."
// The inherited play must likewise source only this Omekamon's own stack; the generic
// {from:["digivolutionCards"]} path scans every stack and can play a matching card from another
// own stack.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Digivolve",
          condition: {
            kind: "securityAtMost",
            value: 1,
          },
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          into: {
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Omnimon (X Antibody)"],
                match: "name",
              },
            ],
          },
          payCost: false,
          optional: true,
          ignoreRequirements: true,
          from: ["hand"],
        },
      ],
    },
    {
      trigger: "OnDeletion",
      optional: true,
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          underFilter: {
            nameOrTrait: [
              {
                tokens: ["King Drasil_7D6"],
                match: "name",
              },
            ],
            controller: "mine",
            zone: "breeding",
          },
          position: "bottom",
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
      isInherited: true,
      isBreeding: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          raw: "when your security stack is removed from, by suspending this Digimon, play 1 [Omekamon] from this Digimon's digivolution cards without paying the cost",
          fireCondition: {
            kind: "triggerRemovedSecuritySeat",
            seat: "mine",
          },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  nameOrTrait: [
                    {
                      tokens: ["Omekamon"],
                      match: "name",
                    },
                  ],
                },
                count: 1,
              },
              fromOwnDigivolutionStack: true,
              payCost: false,
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
              },
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT20-083", compiled);
