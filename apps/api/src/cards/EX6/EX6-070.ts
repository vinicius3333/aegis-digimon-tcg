// @ts-nocheck
import { getCompiledCard, type CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const generated = getCompiledCard("EX6-070")!;

const isDelayedDeleteEffect = (effect: (typeof generated.effects)[number]) => {
  if (
    effect.trigger !== "Main" ||
    effect.keywords?.length !== 1 ||
    effect.keywords[0]?.keyword !== "Delay" ||
    effect.actions?.length !== 1
  ) {
    return false;
  }

  const action = effect.actions[0];
  const filter = action?.target?.filter;
  return (
    action.kind === "Delete" &&
    action.requiresDelayArmed === true &&
    action.optional === true &&
    action.target?.count === 1 &&
    filter?.controller === "opponent" &&
    Array.isArray(filter.kind) &&
    filter.kind.length === 1 &&
    filter.kind[0] === "Digimon" &&
    filter.unsuspended === true
  );
};

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
