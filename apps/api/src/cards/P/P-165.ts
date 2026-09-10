// Hand-fixed: PlayToken uses "Familiar Token" name (matching tokens.ts).
// The token's printed [On Deletion] effect is registered by ST19-12's synthetic
// TOKEN-Familiar-Token module; duplicating it on this parent would apply -6000 DP.
// "delete that token" is bound to the token THIS effect played (bindResultAs/boundRef), so a
// second Familiar Token already in play is untouched.
// [Security] finding 1 is a false positive (no [Main] in card text).
// endOfOpponentTurn is correct standard timing (KB Q5756 confirms deletion).
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Security",
      timing: "endOfBattle",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
          from: ["security"],
          payCost: false,
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlayToken",
          tokens: ["Familiar Token"],
          count: 1,
          payCost: false,
          bindResultAs: "familiarToken",
        },
        {
          kind: "DelayedDelete",
          target: {
            filter: {
              controller: "mine",
              boundRef: "familiarToken",
              nameOrTrait: [{ tokens: ["Familiar Token"], match: "name" }],
            },
            count: 1,
          },
          timing: "endOfOpponentTurn",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayToken",
          tokens: ["Familiar Token"],
          count: 1,
          payCost: false,
          bindResultAs: "familiarToken",
        },
        {
          kind: "DelayedDelete",
          target: {
            filter: {
              controller: "mine",
              boundRef: "familiarToken",
              nameOrTrait: [{ tokens: ["Familiar Token"], match: "name" }],
            },
            count: 1,
          },
          timing: "endOfOpponentTurn",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("P-165", compiled);
