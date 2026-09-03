import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "color",
          tokens: ["Blue"],
          duration: "forTheTurn",
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "Aura",
          target: { filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "none" }, count: "all" },
          effect: { kind: "keyword", keyword: { keyword: "SecurityAttack", amount: -1, raw: "<Security Attack -1>" } },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT3-040", compiled);
export default compiled;
