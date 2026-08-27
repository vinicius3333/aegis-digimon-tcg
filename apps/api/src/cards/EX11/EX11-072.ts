// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// CAP-H-10: nameOrTrait match kind "traitAll" — ALL listed tokens must be present as
// traits simultaneously. KB Q5944: digivolve target must have BOTH [Bird Dragon] AND
// [LIBERATOR] traits. See historical migration ledger
//
// [Your Turn] <Delay> encoding: "When any of your [Shoto Kazama]s suspend, <Delay>"
// followed by a bullet point means: this card is activated as a <Delay> option when
// a Shoto Kazama suspends. The Digivolve action is the CONTENT of the <Delay> activation
// (i.e., what happens when the Delay is used). It is placed inside the SubTrigger's
// actions array, NOT as a sibling action.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Pteromon", "Muchomon", "Shoto Kazama"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
        {
          kind: "PlaceInBattleAreaSelf",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: {
            controller: "mine",
            nameOrTrait: [
              {
                tokens: ["Shoto Kazama"],
                match: "name",
              },
            ],
          },
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
              keyword: { keyword: "Delay", raw: "＜Delay＞" },
              duration: "permanent",
            },
          ],
        },
      ],
    },
    {
      trigger: "Main",
      keywords: [{ keyword: "Delay", raw: "＜Delay＞" }],
      actions: [
        {
          requiresDelayArmed: true,
          kind: "Digivolve",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                { tokens: ["Avian", "Bird"], match: "traitContains" },
                { tokens: ["Vortex Warriors"], match: "trait" },
              ],
            },
            count: 1,
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Bird Dragon", "LIBERATOR"], match: "traitAll" }],
          },
          from: ["hand"],
          payCost: true,
          reduceCost: 3,
          optional: true,
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "ActivateMain",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX11-072", compiled);
