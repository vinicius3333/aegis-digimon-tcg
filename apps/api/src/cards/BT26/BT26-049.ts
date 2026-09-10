import type { Action, CompiledCard, Filter, Target } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const opponentTargets = { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 2 } satisfies Target;
const dataSquadDigimon = {
  filter: {
    controller: "mine",
    zone: "hand",
    kind: ["Digimon", "Tamer"],
    nameOrTrait: [{ tokens: ["DATA SQUAD"], match: "trait" }],
  },
  count: 1,
} satisfies Target;
const dataSquadOption = {
  controller: "mine",
  zone: "hand",
  kind: ["Option"],
  nameOrTrait: [{ tokens: ["DATA SQUAD"], match: "trait" }],
} satisfies Filter;
const playCostCeiling = {
  base: 3,
  raise: 1,
  per: 1,
  filter: { controller: "any", kind: ["Digimon", "Tamer"], suspended: true },
  unit: "cards",
} satisfies NonNullable<Extract<Action, { kind: "PlayWithoutCost" }>["playCostCeiling"]>;
const playOrUseDataSquad = {
  kind: "Modal",
  choose: 1,
  options: [
    [
      {
        kind: "PlayWithoutCost",
        target: dataSquadDigimon,
        from: ["hand"],
        payCost: false,
        playCostCeiling,
      },
    ],
    [
      {
        kind: "UseOptionWithoutCost",
        filter: dataSquadOption,
        from: ["hand"],
        payCost: false,
        allowMultiColor: true,
        playCostCeiling,
      },
    ],
  ],
} satisfies Action;
const reactPlay = {
  kind: "SubTrigger",
  event: "whenSuspended",
  sourceFilter: { controller: "opponent", kind: ["Digimon", "Tamer"] },
  optional: true,
  actions: [playOrUseDataSquad],
} satisfies Action;
const reactTrash = {
  kind: "SubTrigger",
  event: "whenDigivolutionTrashed",
  sourceFilter: { controller: "mine", kind: ["Tamer"], byEffect: true },
  optional: true,
  actions: [playOrUseDataSquad],
} satisfies Action;
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      frequency: "OncePerTurn",
      sharedUseKey: "bt26-049-suspend",
      actions: [{ kind: "Suspend", target: opponentTargets }],
    },
    {
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      sharedUseKey: "bt26-049-suspend",
      actions: [{ kind: "Suspend", target: opponentTargets }],
    },
    { trigger: "AllTurns", frequency: "OncePerTurn", actions: [reactPlay, reactTrash] },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    { namesExact: ["Lilamon"], cost: 3, isAlternate: true },
    { level: 5, traits: ["DATA SQUAD"], cost: 3, isAlternate: true },
  ],
};
registerIrCard("BT26-049", compiled);
export default compiled;
