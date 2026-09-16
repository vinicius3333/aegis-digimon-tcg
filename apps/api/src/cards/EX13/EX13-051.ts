import type { Action, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const otherBlockers: Filter = {
  controller: "mine",
  kind: ["Digimon"],
  keywords: ["Blocker"],
  excludeSelf: true,
};

const preventOtherBlockerLeaving: Action = {
  kind: "Replacement",
  event: "wouldLeavePlay",
  mode: "prevent",
  leaveCause: "otherThanYourEffect",
  optional: true,
  affectsAll: true,
  sourceFilter: otherBlockers,
  target: { filter: otherBlockers, count: "all" },
  cost: {
    kind: "suspend",
    target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
    raw: "by suspending this Digimon",
  },
  raw: "When any of your other Digimon with ＜Blocker＞ would leave the battle area other than by your effects, by suspending this Digimon, they don't leave",
};

const mayUnsuspendWhenAnyOfYoursSuspends: Action = {
  kind: "SubTrigger",
  event: "whenSuspended",
  sourceFilter: { controller: "mine", kind: ["Digimon"] },
  actions: [
    {
      kind: "Unsuspend",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      optional: true,
    },
  ],
  raw: "When any of your Digimon suspend, this Digimon may unsuspend",
};

const compiled: CompiledCard = {
  cardId: "EX13-051",
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] },
    { trigger: "AllTurns", actions: [preventOtherBlockerLeaving] },
    {
      trigger: "OpponentsTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [mayUnsuspendWhenAnyOfYoursSuspends],
    },
  ],
  coverage: "full",
  residual: [],
};

export { compiled };

registerIrCard("EX13-051", compiled);
