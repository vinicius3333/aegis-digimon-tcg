import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: { controllerDefault: "mine" },
          actions: [
            {
              kind: "Replacement",
              event: "wouldBePlayed",
              mode: "reduceCost",
              amount: 1,
              raw: "reduce the cost by 1",
              condition: { kind: "youHave", filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Tamer"], colors: ["Yellow"] }, raw: "you have a yellow Tamer in play" },
            },
          ],
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        { kind: "ModifyDP", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 3 }, amount: -5000, duration: "untilOpponentTurnEnd" },
        { kind: "GainKeyword", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 3 }, keyword: { keyword: "SecurityAttack", amount: -1, raw: "＜Security Attack -1＞" }, duration: "untilOpponentTurnEnd" },
      ],
    },
    { trigger: "Security", actions: [{ kind: "ActivateMain" }], isSecurity: true },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT11-101", compiled);
