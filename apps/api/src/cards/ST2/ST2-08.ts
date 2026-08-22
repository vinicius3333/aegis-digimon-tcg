import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [{
    trigger: "YourTurn",
    isInherited: true,
    actions: [{
      kind: "Aura",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      effect: { kind: "keyword", keyword: { keyword: "SecurityAttack", amount: 1, raw: "<Security Attack +1>" } },
      while: {
        kind: "opponentHas",
        filter: { zone: "battleArea", digivolutionCards: "none", controllerDefault: "opponent", kind: ["Digimon"] },
        raw: "your opponent has a battle-area Digimon with no digivolution cards",
      },
    }],
  }],
  coverage: "full",
  residual: [],
};

registerIrCard("ST2-08", compiled);
