import { EffectTiming, EffectDuration, isDigimon, isTamer, CardColor, type CompiledCard } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { security } from "../../engine/effects/builders.js";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX4-068 — Brightness Wave.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          condition: {
            kind: "youHave",
            filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Digimon", "Tamer"], colors: ["Green"] },
            raw: "you have a green Digimon or Tamer in play",
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "RepeatPerCount",
          countSource: "distinctOwnDigimonColors",
          countFilter: { controller: "mine", kind: ["Digimon"] },
          countUnit: "colors",
          action: {
            kind: "ModifyDP",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            amount: -6000,
            duration: "forTheTurn",
          },
        },
        {
          kind: "ModifyDP",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: -6000,
          duration: "forTheTurn",
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: -12000,
          duration: "forTheTurn",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [{ kind: "WaiveColorRequirement", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, condition: { kind: "youHave", filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Digimon", "Tamer"], colors: ["Green"] } } }],
    },
    {
      trigger: "Main",
      actions: [
        { kind: "ModifyDP", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 }, amount: -6000, duration: "forTheTurn" },
        { kind: "RepeatPerCount", countSource: "unused", countScaling: { per: 1, filter: { controller: "mine", kind: ["Digimon"] }, unit: "colors" }, action: { kind: "ModifyDP", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 }, amount: -6000, duration: "forTheTurn" } },
      ],
    },
    {
      trigger: "Security",
      actions: [{ kind: "ModifyDP", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 }, amount: -12000, duration: "forTheTurn" }],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard(cardId, compiled);
export default module;
