// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const self = { filter: { isSelfRef: true }, count: 1, isSelf: true };
const destroyMode = {
  controller: "mine",
  nameOrTrait: [{ tokens: ["Chronomon: Destroy Mode"], match: "nameExact" }],
};

export const compiled: CompiledCard = {
  keywords: [
    { keyword: "Collision", raw: "＜Collision＞" },
    { keyword: "Reboot", raw: "＜Reboot＞" },
    { keyword: "Blocker", raw: "＜Blocker＞" },
  ],
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Restrict",
          target: self,
          restriction: "dpImmune",
          duration: "untilOpponentTurnEnd",
          byOpponentEffectsOnly: true,
        },
        { kind: "StackTrashLock", target: self, duration: "untilOpponentTurnEnd" },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Digivolve",
              target: self,
              into: destroyMode,
              from: ["hand", "trash"],
              payCost: false,
              optional: true,
              abortOnDecline: true,
            },
            // "By digivolving it into [Chronomon: Destroy Mode] ... it doesn't leave": the
            // digivolution is the cost, so the leave is prevented only when it actually happened.
            // Without this gate the replacement saves the Digimon even with no Destroy Mode to
            // digivolve into.
            { kind: "Prevent", condition: { kind: "ifThisEffectDigivolved" } },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  assemblyRequirement: [
    {
      reduceCost: 5,
      materials: [
        {
          count: 5,
          nameOrTrait: [
            { tokens: ["Chronomon"], match: "text" },
            { tokens: ["Shaman"], match: "trait" },
          ],
          differentLevels: true,
        },
      ],
    },
  ],
};

registerIrCard("BT26-085", compiled);
export default compiled;
