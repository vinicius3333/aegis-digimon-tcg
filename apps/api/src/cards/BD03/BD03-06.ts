import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Jamming", raw: "＜Jamming＞" }] },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 4,
          add: [],
          rest: "deckTop",
          raw: "Reveal the top 4 cards of your deck. Return them to the top of your deck.",
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "Aura",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          effect: { kind: "keyword", keyword: { keyword: "Blocker", raw: "＜Blocker＞" } },
          while: {
            kind: "selfHasNameContaining",
            names: ["Garurumon"],
            raw: "this Digimon has [Garurumon] in its name",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BD03-06", compiled);
