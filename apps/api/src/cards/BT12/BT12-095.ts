import type { CompiledCard, Filter, Target } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const target: Target = {
  filter: {
    controller: "mine",
    kind: ["Digimon"],
    nameOrTrait: [{ tokens: ["Agumon", "Greymon"], match: "name" }],
  },
  count: 1,
};
const sourceFilter: Filter = { controller: "mine", kind: ["Digimon"] };

const grantBlocker: CompiledCard["effects"][number] = {
  trigger: "OnPlay",
  actions: [
    { kind: "ModifyDP", target, amount: 1000, duration: "untilOpponentTurnEnd" },
    {
      kind: "GainKeyword",
      target: { sameTarget: true, filter: {}, count: 1 },
      keyword: { keyword: "Blocker", raw: "＜Blocker＞" },
      duration: "untilOpponentTurnEnd",
    },
  ],
};

export const compiled: CompiledCard = {
  effects: [
    grantBlocker,
    { ...grantBlocker, trigger: "StartOfYourMainPhase" },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          sourceFilter,
          digivolveIntoFilter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Greymon", "Omnimon"], match: "name" }],
          },
          actions: [
            {
              kind: "GainMemory",
              amount: 1,
              cost: {
                kind: "suspend",
                target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                raw: "by suspending this Tamer",
              },
            },
          ],
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

export default registerIrCard("BT12-095", compiled);
