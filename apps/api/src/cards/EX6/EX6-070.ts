// @ts-nocheck
import { getCompiledCard, type CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const generated = getCompiledCard("EX6-070")!;

const isDelayedDeleteEffect = (effect: (typeof generated.effects)[number]) =>
  effect.trigger === "Main" && effect.keywords?.some((keyword) => keyword.keyword === "Delay");

/** EX6-070 — Phantom Pain, with end-turn Delay arming structured. */
export const compiled: CompiledCard = {
  ...generated,
  effects: [
    ...generated.effects
      .filter((effect) => !isDelayedDeleteEffect(effect))
      .map((effect) =>
        effect.trigger === "EndOfOpponentsTurn"
          ? {
              ...effect,
              actions: [
                {
                  kind: "GainKeyword",
                  target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                  keyword: { keyword: "Delay" },
                  duration: "permanent",
                  condition: {
                    kind: "youHave",
                    filter: {
                      controllerDefault: "mine",
                      kind: ["Digimon"],
                      nameOrTrait: [{ tokens: ["Lilithmon"], match: "name" }],
                    },
                    raw: "you have a Digimon with [Lilithmon] in its name",
                  },
                },
              ],
            }
          : effect,
      ),
    {
      trigger: "Main",
      keywords: [{ keyword: "Delay" }],
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], unsuspended: true }, count: 1 },
          requiresDelayArmed: true,
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX6-070", compiled);
