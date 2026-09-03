import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          grant: "dpReductionImmunity",
          tokens: ["DeDigivolveImmunity"],
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "securityAtLeast",
            value: 3,
          },
        },
        {
          kind: "SelectBind",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
            bindAs: "blockerRebootTarget",
          },
          condition: {
            kind: "securityAtMost",
            value: 3,
            raw: "you have 3 or fewer security cards",
          },
        },
        {
          kind: "GainKeyword",
          target: { fromSelectionRef: "blockerRebootTarget", filter: {}, count: 1 },
          keyword: {
            keyword: "Blocker",
            raw: "＜Blocker＞",
          },
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "securityAtMost",
            value: 3,
            raw: "you have 3 or fewer security cards",
          },
        },
        {
          kind: "GainKeyword",
          target: { fromSelectionRef: "blockerRebootTarget", filter: {}, count: 1 },
          keyword: {
            keyword: "Reboot",
            raw: "＜Reboot＞",
          },
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "securityAtMost",
            value: 3,
            raw: "you have 3 or fewer security cards",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          grant: "dpReductionImmunity",
          tokens: ["DeDigivolveImmunity"],
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "securityAtLeast",
            value: 3,
          },
        },
        {
          kind: "SelectBind",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
            bindAs: "blockerRebootTarget",
          },
          condition: {
            kind: "securityAtMost",
            value: 3,
            raw: "you have 3 or fewer security cards",
          },
        },
        {
          kind: "GainKeyword",
          target: { fromSelectionRef: "blockerRebootTarget", filter: {}, count: 1 },
          keyword: {
            keyword: "Blocker",
            raw: "＜Blocker＞",
          },
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "securityAtMost",
            value: 3,
            raw: "you have 3 or fewer security cards",
          },
        },
        {
          kind: "GainKeyword",
          target: { fromSelectionRef: "blockerRebootTarget", filter: {}, count: 1 },
          keyword: {
            keyword: "Reboot",
            raw: "＜Reboot＞",
          },
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "securityAtMost",
            value: 3,
            raw: "you have 3 or fewer security cards",
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Aura",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          effect: {
            kind: "modifyDP",
            amount: 1000,
          },
          while: {
            kind: "selfTopHasText",
            filter: { nameOrTrait: [{ tokens: ["Pulsemon"], match: "text" }] },
            raw: "this Digimon has [Pulsemon] in its text",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Pulsemon"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT16-055", compiled);
export { compiled };
