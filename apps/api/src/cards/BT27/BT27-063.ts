import type { CompiledCard } from "@aegis/shared/effects/ir/card";
import type { Filter, Target } from "@aegis/shared/effects/ir/filters/filter";
import { registerIrCard } from "#api/engine/effects/interpreter";

const self: Target = { filter: { isSelfRef: true }, count: 1, isSelf: true };
const ownBlockers: Filter = { controller: "mine", kind: ["Digimon"], keywords: ["Blocker"] };
const blackBlockerInHand: Filter = {
  controllerDefault: "mine",
  zone: "hand",
  kind: ["Digimon"],
  colors: ["Black"],
  levelComparison: { op: "lte", value: 5 },
  keywords: ["Blocker"],
};

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] },
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          effectTextPart:
            "[All Turns] [Once Per Turn] When this Digimon suspends, ＜De-Digivolve 1＞ 1 of your opponent's Digimon.",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "DeDigivolve",
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
              amount: 1,
            },
          ],
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          leaveCause: "otherThanYourEffect",
          optional: true,
          sourceFilter: ownBlockers,
          target: { filter: ownBlockers, count: 1 },
          cost: { kind: "suspend", target: self, raw: "by suspending this Digimon" },
          raw: "When any of your Digimon with ＜Blocker＞ would leave the battle area other than by your effects, by suspending this Digimon, 1 of your Digimon doesn't leave",
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: { filter: blackBlockerInHand, count: 1 },
              from: ["hand"],
              payCost: false,
              optional: true,
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT27-063", compiled);
