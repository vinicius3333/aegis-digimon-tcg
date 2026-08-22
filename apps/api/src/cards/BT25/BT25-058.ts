// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const opponentDigimonOrTamer = { controller: "opponent", kind: ["Digimon", "Tamer"] };
const opponentDigimon = { controller: "opponent", kind: ["Digimon"] };
const triggeredDigimon = { controllerDefault: "any", kind: ["Digimon"] };

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        { kind: "GainKeyword", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, keyword: { keyword: "Blocker" }, duration: "permanent" },
        { kind: "GainKeyword", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, keyword: { keyword: "Fortitude" }, duration: "permanent" },
      ],
      keywords: [
        { keyword: "Reboot", raw: "＜Reboot＞" },
        { keyword: "Blocker", raw: "＜Blocker＞" },
        { keyword: "Fortitude", raw: "＜Fortitude＞" },
      ],
    },
    ...(["OnPlay", "WhenDigivolving", "WhenAttacking"] as const).map((trigger) => ({
      trigger,
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
      actions: [
        { kind: "Suspend", target: { filter: opponentDigimonOrTamer, count: 1 }, optional: true },
        { kind: "Restrict", target: { filter: opponentDigimonOrTamer, count: 1 }, restriction: "unsuspend", duration: "untilOpponentTurnEnd" },
      ],
    })),
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: triggeredDigimon,
          actions: [
            { kind: "DeDigivolve", target: { filter: opponentDigimon, count: 1 }, amount: 1 },
            { kind: "Battle", attacker: { filter: { isSelfRef: true }, count: 1, isSelf: true }, target: { filter: opponentDigimon, count: 1 }, optional: true },
          ],
        },
        {
          kind: "SubTrigger",
          event: "whenAnyDigivolves",
          sourceFilter: triggeredDigimon,
          actions: [
            { kind: "DeDigivolve", target: { filter: opponentDigimon, count: 1 }, amount: 1 },
            { kind: "Battle", attacker: { filter: { isSelfRef: true }, count: 1, isSelf: true }, target: { filter: opponentDigimon, count: 1 }, optional: true },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 5, traits: ["TS"], cost: 4, isAlternate: true }],
};

registerIrCard("BT25-058", compiled);
