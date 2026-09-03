import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR for BT10-089 (Akari Hinomoto).
// OnPlay PlayWithoutCost source zones: text reads "from your hand or from
// under one of your Tamers", but the declarative effect record only searched "hand" —
// the "under one of your Tamers" zone was dropped. Add "underTamers" (the
// zone used by BT19-026's analogous PlayWithoutCost fix) so cards stacked
// beneath a Tamer permanent qualify too. KB Q2021 confirms this is limited
// to cards directly under a Tamer permanent, not the digivolution stack of
// a Digimon that itself digivolved from a Tamer.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Dorulumon"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          from: ["hand", "underTamers"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Xros Heart"],
                match: "trait",
              },
            ],
          },
          actions: [
            {
              kind: "Draw",
              controller: "mine",
              amount: 1,
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
              optional: true,
              abortOnDecline: true,
            },
          ],
          raw: "whenPlayed",
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

registerIrCard("BT10-089", compiled);
